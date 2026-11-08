import { buildFlightPlan, phaseBatteryPercent, sortedWaypoints } from './flightPlan';
import { haversineMeters, roundHalfAway } from './geo';
import { RULES } from './rules';
import type { Waypoint } from './schemas';

export type EstimateIssue = {
  code:
    | 'too_few_waypoints'
    | 'too_many_waypoints'
    | 'altitude_out_of_range'
    | 'leg_too_long'
    | 'route_too_long'
    | 'duplicate_waypoint'
    | 'battery_reserve_low'
    | 'battery_insufficient';
  severity: 'warning' | 'error';
  message: string;
  /** Field path for form errors, e.g. `waypoints.2.altitudeMeters`. */
  field?: string;
};

export type MissionEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  batteryUsedPercent: number;
  batteryRemainingPercent: number;
  issues: EstimateIssue[];
  canBeReady: boolean;
};

const { route, battery } = RULES;

function routeIssues(ordered: Waypoint[]): EstimateIssue[] {
  const issues: EstimateIssue[] = [];
  if (ordered.length < route.minWaypoints) {
    issues.push({
      code: 'too_few_waypoints',
      severity: 'error',
      message: `Add at least ${route.minWaypoints} waypoints: home and one destination.`,
      field: 'waypoints',
    });
  }
  if (ordered.length > route.maxWaypoints) {
    issues.push({
      code: 'too_many_waypoints',
      severity: 'error',
      message: `A mission can have at most ${route.maxWaypoints} waypoints.`,
      field: 'waypoints',
    });
  }
  ordered.forEach((wp, i) => {
    if (
      wp.altitudeMeters < route.minAltitudeMeters ||
      wp.altitudeMeters > route.maxAltitudeMeters
    ) {
      issues.push({
        code: 'altitude_out_of_range',
        severity: 'error',
        message: `Waypoint ${i + 1}: altitude must be ${route.minAltitudeMeters}–${route.maxAltitudeMeters} m.`,
        field: `waypoints.${i}.altitudeMeters`,
      });
    }
  });

  let total = 0;
  const loop = ordered.length > 1 ? [...ordered, ordered[0]!] : ordered;
  for (let i = 1; i < loop.length; i++) {
    const a = loop[i - 1]!;
    const b = loop[i]!;
    const leg = haversineMeters(a, b);
    total += leg;
    const label = i === loop.length - 1 ? 'the return leg' : `waypoint ${i + 1}`;
    if (leg > route.maxLegMeters) {
      issues.push({
        code: 'leg_too_long',
        severity: 'error',
        message: `The leg to ${label} is ${Math.round(leg)} m; the limit is ${route.maxLegMeters} m.`,
        field: `waypoints.${i % ordered.length}`,
      });
    }
    const vertical = Math.abs(a.altitudeMeters - b.altitudeMeters);
    if (
      i < ordered.length &&
      leg < route.duplicateToleranceMeters &&
      vertical < route.duplicateToleranceMeters
    ) {
      issues.push({
        code: 'duplicate_waypoint',
        severity: 'error',
        message: `Waypoint ${i + 1} is within ${route.duplicateToleranceMeters} m of the previous one.`,
        field: `waypoints.${i}`,
      });
    }
  }
  if (total > route.maxRouteMeters) {
    issues.push({
      code: 'route_too_long',
      severity: 'error',
      message: `The route is ${Math.round(total)} m; the limit is ${route.maxRouteMeters} m.`,
      field: 'waypoints',
    });
  }
  return issues;
}

/**
 * Distance, duration and battery for the full flight (take-off → waypoints → home → landing).
 * The same function runs in the planner and on the server (RULES.md §4).
 */
export function estimateMission(waypoints: readonly Waypoint[]): MissionEstimate {
  const ordered = sortedWaypoints(waypoints);
  const issues = routeIssues(ordered);
  const phases = buildFlightPlan(ordered);

  let distance = 0;
  let duration = 0;
  let used = 0;
  for (const phase of phases) {
    distance += phase.distanceMeters;
    duration += phase.durationSeconds;
    used += phaseBatteryPercent(phase);
  }
  const remaining = battery.startPercent - used;

  if (ordered.length >= route.minWaypoints) {
    if (remaining < battery.insufficientPercent) {
      issues.push({
        code: 'battery_insufficient',
        severity: 'error',
        message: `Estimated landing battery is ${roundHalfAway(remaining, 1)}%; at least ${battery.insufficientPercent}% is required.`,
      });
    } else if (remaining < battery.reserveWarningPercent) {
      issues.push({
        code: 'battery_reserve_low',
        severity: 'warning',
        message: `Estimated landing battery is ${roundHalfAway(remaining, 1)}%, below the ${battery.reserveWarningPercent}% reserve.`,
      });
    }
  }

  return {
    distanceMeters: roundHalfAway(distance),
    durationSeconds: roundHalfAway(duration),
    batteryUsedPercent: roundHalfAway(used, 1),
    batteryRemainingPercent: roundHalfAway(remaining, 1),
    issues,
    canBeReady: !issues.some((issue) => issue.severity === 'error'),
  };
}
