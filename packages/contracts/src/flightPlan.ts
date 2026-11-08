import { haversineMeters, type Position3D } from './geo';
import { RULES } from './rules';
import type { Waypoint } from './schemas';
import { UAV_PROFILES, DEFAULT_UAV_ID, type UavProfile } from './uav';

export type PhaseKind = 'climbing' | 'cruising' | 'hovering' | 'descending';

/** One straight-line piece of a flight. Positions are constant-velocity between `from` and `to`. */
export type FlightPhase = {
  kind: PhaseKind;
  from: Position3D;
  to: Position3D;
  durationSeconds: number;
  distanceMeters: number;
  /** Index (in order) of the waypoint this phase ends at, when it ends at one. */
  arrivesAtWaypoint?: number;
};

const DEFAULT_PROFILE = UAV_PROFILES[DEFAULT_UAV_ID];

function vertical(
  from: Position3D,
  toAltitude: number,
  uav: UavProfile = DEFAULT_PROFILE,
): FlightPhase | null {
  const delta = toAltitude - from.altitudeMeters;
  if (Math.abs(delta) < 1e-9) return null;
  const climbing = delta > 0;
  return {
    kind: climbing ? 'climbing' : 'descending',
    from,
    to: { ...from, altitudeMeters: toAltitude },
    durationSeconds:
      Math.abs(delta) / (climbing ? uav.climbRateMetersPerSecond : uav.descentRateMetersPerSecond),
    distanceMeters: Math.abs(delta),
  };
}

function horizontal(
  from: Position3D,
  to: Position3D,
  uav: UavProfile = DEFAULT_PROFILE,
): FlightPhase | null {
  const distance = haversineMeters(from, to);
  if (distance < 1e-9) return null;
  return {
    kind: 'cruising',
    from,
    to: { ...to, altitudeMeters: from.altitudeMeters },
    durationSeconds: distance / uav.cruiseSpeedMetersPerSecond,
    distanceMeters: distance,
  };
}

/**
 * Phases to fly from `from` to `target`. Climb happens before the horizontal leg, descent
 * after it (RULES.md §3).
 */
export function legPhases(
  from: Position3D,
  target: Position3D,
  uav: UavProfile = DEFAULT_PROFILE,
): FlightPhase[] {
  const phases: FlightPhase[] = [];
  let at = from;
  if (target.altitudeMeters > at.altitudeMeters) {
    const climb = vertical(at, target.altitudeMeters, uav);
    if (climb) {
      phases.push(climb);
      at = climb.to;
    }
  }
  const cruise = horizontal(at, target, uav);
  if (cruise) {
    phases.push(cruise);
    at = cruise.to;
  }
  if (target.altitudeMeters < at.altitudeMeters) {
    const descent = vertical(at, target.altitudeMeters, uav);
    if (descent) phases.push(descent);
  }
  return phases;
}

/** Return-to-home from any position: fly at the current altitude to home, then land. */
export function returnHomePhases(
  from: Position3D,
  home: Position3D,
  uav: UavProfile = DEFAULT_PROFILE,
): FlightPhase[] {
  const phases: FlightPhase[] = [];
  const cruise = horizontal(from, home, uav);
  let at = from;
  if (cruise) {
    phases.push(cruise);
    at = cruise.to;
  }
  const landing = vertical(at, 0, uav);
  if (landing) phases.push(landing);
  return phases;
}

/** Descend and land where the drone is (abort). */
export function landInPlacePhases(
  from: Position3D,
  uav: UavProfile = DEFAULT_PROFILE,
): FlightPhase[] {
  const landing = vertical(from, 0, uav);
  return landing ? [landing] : [];
}

export function sortedWaypoints(waypoints: readonly Waypoint[]): Waypoint[] {
  return [...waypoints].sort((a, b) => a.order - b.order);
}

/**
 * The complete planned flight: take off at home, visit every waypoint in order (hovering at
 * each), return home and land. Requires at least one waypoint (home).
 */
export function buildFlightPlan(
  waypoints: readonly Waypoint[],
  uav: UavProfile = DEFAULT_PROFILE,
): FlightPhase[] {
  const ordered = sortedWaypoints(waypoints);
  const home = ordered[0];
  if (!home) return [];
  const homeAir: Position3D = { ...home };
  const ground: Position3D = { ...home, altitudeMeters: 0 };

  const phases: FlightPhase[] = [];
  const takeoff = vertical(ground, homeAir.altitudeMeters, uav);
  if (takeoff) phases.push(takeoff);

  let at = homeAir;
  ordered.slice(1).forEach((waypoint, index) => {
    const target: Position3D = { ...waypoint };
    const leg = legPhases(at, target, uav);
    const last = leg.at(-1);
    if (last) last.arrivesAtWaypoint = index + 1;
    phases.push(...leg);
    phases.push({
      kind: 'hovering',
      from: target,
      to: target,
      durationSeconds: RULES.flight.hoverAtWaypointSeconds,
      distanceMeters: 0,
      ...(last ? {} : { arrivesAtWaypoint: index + 1 }),
    });
    at = target;
  });

  phases.push(...legPhases(at, homeAir, uav));
  phases.push(...returnHomePhases(homeAir, homeAir, uav));
  return phases;
}

export function phaseBatteryPercent(
  phase: Pick<FlightPhase, 'kind' | 'durationSeconds'>,
  uav: UavProfile = DEFAULT_PROFILE,
): number {
  return uav.batteryDrainPercentPerSecond[phase.kind] * phase.durationSeconds;
}
