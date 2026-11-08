import {
  buildFlightPlan,
  landInPlacePhases,
  phaseBatteryPercent,
  returnHomePhases,
  sortedWaypoints,
  type FlightPhase,
} from './flightPlan';
import { haversineMeters, interpolate, roundHalfAway, type Position3D } from './geo';
import { RULES } from './rules';
import type { Mission, MissionCommand, MissionStatus, Telemetry } from './schemas';
import { isTerminal, nextStatus, type MissionTrigger } from './stateMachine';

export type MissionEventType =
  | 'takeoff'
  | 'waypoint_reached'
  | 'paused'
  | 'resumed'
  | 'low_battery'
  | 'critical_battery'
  | 'fault_injected'
  | 'link_lost'
  | 'link_restored'
  | 'link_failsafe'
  | 'return_home_started'
  | 'abort_started'
  | 'landed'
  | 'completed'
  | 'aborted'
  | 'failed';

export type MissionEvent = {
  type: MissionEventType;
  sequence: number;
  recordedAt: string;
  elapsedSeconds: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
};

export type ReturnHomeCause = 'operator' | 'battery' | 'link' | 'route_finished';

export type SimulatorSnapshot = {
  status: MissionStatus;
  telemetry: Telemetry;
  events: readonly MissionEvent[];
  /** Telemetry sampled once per simulated second, for charts and reports. */
  history: readonly Telemetry[];
  flownPath: readonly Position3D[];
  elapsedSeconds: number;
  distanceFlownMeters: number;
  waypointsReached: number;
  waypointCount: number;
  linkLost: boolean;
  returnHomeCause: ReturnHomeCause | null;
  /** True while landing in place after an abort command. */
  aborting: boolean;
};

export type DemoInjection =
  { type: 'low_battery' } | { type: 'link_loss'; durationSeconds: number };

export type SimulatorOptions = {
  mission: Pick<Mission, 'id' | 'waypoints'>;
  seed: number;
  /** ISO timestamp of take-off. Simulated time is added to it, so output is deterministic. */
  startedAt: string;
};

/** mulberry32: tiny, fast, seedable PRNG. Only used for cosmetic jitter. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STEP_SECONDS = RULES.simulator.tickMilliseconds / 1000;
const STEPS_PER_SAMPLE = Math.round(1 / STEP_SECONDS);

/**
 * Deterministic flight simulator (RULES.md §7). It has no timers: the caller advances
 * simulated time with `advance(seconds)`. Same mission, seed and calls → identical output.
 */
export function createSimulator({ mission, seed, startedAt }: SimulatorOptions) {
  const waypoints = sortedWaypoints(mission.waypoints);
  const home = waypoints[0];
  if (!home || waypoints.length < RULES.route.minWaypoints) {
    throw new Error('A mission needs at least two waypoints to fly');
  }
  const homeAir: Position3D = { ...home };
  const random = createRandom(seed);
  const startMs = Date.parse(startedAt);

  let status: MissionStatus = 'active';
  let phases: FlightPhase[] = buildFlightPlan(waypoints);
  let phaseIndex = 0;
  let phaseElapsed = 0;
  let position: Position3D = { ...homeAir, altitudeMeters: 0 };
  let battery: number = RULES.battery.startPercent;
  let elapsed = 0;
  let distanceFlown = 0;
  let waypointsReached = 0;
  let sequence = 0;
  let steps = 0;
  let lowBatteryRaised = false;
  let criticalRaised = false;
  let linkLostRemaining: number | null = null;
  let linkLostFor = 0;
  let returnHomeCause: ReturnHomeCause | null = null;
  let aborting = false;
  let progressBase = 0;
  let planSeconds = phases.reduce((sum, p) => sum + p.durationSeconds, 0);
  let planElapsed = 0;

  const events: MissionEvent[] = [];
  const history: Telemetry[] = [];
  const flownPath: Position3D[] = [{ ...position }];
  let telemetry: Telemetry;

  const timeAt = (seconds: number) => new Date(startMs + Math.round(seconds * 1000)).toISOString();

  function progress(): number {
    if (planSeconds <= 0) return 100;
    return Math.min(100, progressBase + (100 - progressBase) * (planElapsed / planSeconds));
  }

  function currentSpeed(): number {
    if ((status === 'paused' && !aborting) || isTerminal(status)) return 0;
    const phase = phases[phaseIndex];
    if (!phase) return 0;
    switch (phase.kind) {
      case 'cruising':
        return RULES.flight.cruiseSpeedMetersPerSecond;
      case 'climbing':
        return RULES.flight.climbRateMetersPerSecond;
      case 'descending':
        return RULES.flight.descentRateMetersPerSecond;
      default:
        return 0;
    }
  }

  function makeTelemetry(): Telemetry {
    sequence += 1;
    const airborne = position.altitudeMeters > 0.05;
    const speed = currentSpeed();
    const speedJitter =
      speed > 0 ? (random() * 2 - 1) * RULES.simulator.speedJitterMetersPerSecond : 0;
    const altJitter = airborne ? (random() * 2 - 1) * RULES.simulator.altitudeJitterMeters : 0;
    return {
      missionId: mission.id,
      sequence,
      recordedAt: timeAt(elapsed),
      latitude: position.latitude,
      longitude: position.longitude,
      altitudeMeters: roundHalfAway(Math.max(0, position.altitudeMeters + altJitter), 1),
      speedMetersPerSecond: roundHalfAway(Math.max(0, speed + speedJitter), 1),
      batteryPercent: roundHalfAway(Math.max(0, battery), 1),
      progressPercent: roundHalfAway(progress(), 1),
    };
  }

  function emit(
    type: MissionEventType,
    message: string,
    severity: MissionEvent['severity'] = 'info',
  ) {
    events.push({
      type,
      sequence: sequence + 1,
      recordedAt: timeAt(elapsed),
      elapsedSeconds: roundHalfAway(elapsed, 1),
      message,
      severity,
    });
  }

  function transition(trigger: MissionTrigger): boolean {
    const next = nextStatus(status, trigger);
    if (!next) return false;
    status = next;
    return true;
  }

  function replacePlan(next: FlightPhase[]) {
    progressBase = progress();
    phases = next;
    phaseIndex = 0;
    phaseElapsed = 0;
    planElapsed = 0;
    planSeconds = next.reduce((sum, p) => sum + p.durationSeconds, 0);
  }

  function startReturnHome(cause: ReturnHomeCause, trigger: MissionTrigger): boolean {
    if (!transition(trigger)) return false;
    returnHomeCause = cause;
    if (cause !== 'route_finished') replacePlan(returnHomePhases(position, homeAir));
    const reason = {
      operator: 'Operator requested return home',
      battery: 'Critical battery: returning home automatically',
      link: 'Link failsafe: returning home automatically',
      route_finished: 'All waypoints reached: returning home',
    }[cause];
    emit(
      'return_home_started',
      reason,
      cause === 'operator' || cause === 'route_finished' ? 'info' : 'critical',
    );
    return true;
  }

  function finish(trigger: MissionTrigger) {
    if (!transition(trigger)) return;
    linkLostRemaining = null;
    const messages: Partial<
      Record<MissionStatus, [MissionEventType, string, MissionEvent['severity']]>
    > = {
      completed: ['completed', 'Mission completed', 'info'],
      aborted: ['aborted', 'Mission ended before all waypoints were reached', 'warning'],
      failed: ['failed', 'Battery depleted before landing', 'critical'],
    };
    const entry = messages[status];
    if (entry) emit(entry[0], entry[1], entry[2]);
  }

  function checkBattery() {
    if (!lowBatteryRaised && battery < RULES.battery.lowEventPercent) {
      lowBatteryRaised = true;
      emit('low_battery', `Battery below ${RULES.battery.lowEventPercent}%`, 'warning');
    }
    if (!criticalRaised && battery < RULES.battery.criticalEventPercent) {
      criticalRaised = true;
      emit('critical_battery', `Battery below ${RULES.battery.criticalEventPercent}%`, 'critical');
      if (!aborting && (status === 'active' || status === 'paused')) {
        startReturnHome('battery', 'failsafe_return_home');
      }
    }
    if (battery <= 0 && !isTerminal(status)) {
      battery = 0;
      finish('battery_depleted');
    }
  }

  function step(dt: number) {
    if (isTerminal(status)) return;
    elapsed += dt;

    if (linkLostRemaining !== null) {
      linkLostFor += dt;
      linkLostRemaining -= dt;
      if (linkLostRemaining <= 1e-9) {
        linkLostRemaining = null;
        linkLostFor = 0;
        emit('link_restored', 'Drone link restored');
      } else if (
        linkLostFor > RULES.link.failsafeAfterSeconds &&
        (status === 'active' || status === 'paused') &&
        returnHomeCause === null &&
        !aborting
      ) {
        emit(
          'link_failsafe',
          `Link lost for more than ${RULES.link.failsafeAfterSeconds} s`,
          'critical',
        );
        startReturnHome('link', 'failsafe_return_home');
      }
    }

    if (status === 'paused' && !aborting) {
      battery -= RULES.batteryDrainPercentPerSecond.hovering * dt;
      checkBattery();
      return;
    }

    let remaining = dt;
    while (remaining > 1e-9 && !isTerminal(status)) {
      const phase = phases[phaseIndex];
      if (!phase) {
        // Plan exhausted: we are on the ground at the end of a return or an abort.
        if (status === 'active' && !aborting) {
          startReturnHome('route_finished', 'route_finished');
          continue;
        }
        emit('landed', 'Landed');
        if (aborting) {
          finish('abort');
        } else {
          finish(
            waypointsReached >= waypoints.length - 1 ? 'landed_all_reached' : 'landed_incomplete',
          );
        }
        break;
      }
      const left = phase.durationSeconds - phaseElapsed;
      const used = Math.min(left, remaining);
      const before = position;
      phaseElapsed += used;
      planElapsed += used;
      remaining -= used;
      battery -= phaseBatteryPercent({ kind: phase.kind, durationSeconds: used });
      position = interpolate(
        phase.from,
        phase.to,
        phase.durationSeconds > 0 ? phaseElapsed / phase.durationSeconds : 1,
      );
      distanceFlown +=
        haversineMeters(before, position) +
        Math.abs(position.altitudeMeters - before.altitudeMeters);

      if (phaseElapsed >= phase.durationSeconds - 1e-9) {
        if (
          phase.arrivesAtWaypoint !== undefined &&
          returnHomeCause === null &&
          status === 'active'
        ) {
          waypointsReached = Math.max(waypointsReached, phase.arrivesAtWaypoint);
          emit(
            'waypoint_reached',
            `Reached waypoint ${phase.arrivesAtWaypoint + 1} of ${waypoints.length}`,
          );
        }
        phaseIndex += 1;
        phaseElapsed = 0;
        // The original plan ends with the return leg; switch state when it starts.
        if (
          status === 'active' &&
          !aborting &&
          waypointsReached >= waypoints.length - 1 &&
          returnHomeCause === null
        ) {
          const next = phases[phaseIndex];
          if (next && next.kind !== 'hovering') startReturnHome('route_finished', 'route_finished');
        }
      }
      checkBattery();
    }
  }

  function snapshot(): SimulatorSnapshot {
    return {
      status,
      telemetry,
      events: [...events],
      history: [...history],
      flownPath: [...flownPath],
      elapsedSeconds: roundHalfAway(elapsed, 1),
      distanceFlownMeters: roundHalfAway(distanceFlown),
      waypointsReached,
      waypointCount: waypoints.length,
      linkLost: linkLostRemaining !== null,
      returnHomeCause,
      aborting,
    };
  }

  emit('takeoff', 'Take-off from home');
  telemetry = makeTelemetry();
  history.push(telemetry);

  return {
    /** Advances simulated time in fixed 200 ms steps and returns the latest snapshot. */
    advance(seconds: number): SimulatorSnapshot {
      let left = seconds;
      while (left > 1e-9 && !isTerminal(status)) {
        const dt = Math.min(STEP_SECONDS, left);
        left -= dt;
        step(dt);
        telemetry = makeTelemetry();
        steps += 1;
        if (steps % STEPS_PER_SAMPLE === 0 || isTerminal(status)) {
          history.push(telemetry);
          flownPath.push({ ...position });
        }
      }
      return snapshot();
    },

    /** Applies an operator command. Returns false (and changes nothing) if invalid now. */
    command(command: MissionCommand): boolean {
      if (aborting) return false;
      switch (command) {
        case 'pause':
          if (!transition('pause')) return false;
          emit('paused', 'Paused: hovering in place');
          return true;
        case 'resume':
          if (!transition('resume')) return false;
          emit('resumed', 'Resumed');
          return true;
        case 'return_home':
          return startReturnHome('operator', 'return_home');
        case 'abort':
          // Abort lands in place; the mission becomes `aborted` on touchdown (RULES.md §5).
          if (aborting || nextStatus(status, 'abort') === null) return false;
          aborting = true;
          replacePlan(landInPlacePhases(position));
          emit('abort_started', 'Abort: landing in place', 'warning');
          return true;
      }
    },

    /** Fault injection for demo mode (RULES.md §8). */
    inject(injection: DemoInjection): boolean {
      if (isTerminal(status)) return false;
      if (injection.type === 'low_battery') {
        emit(
          'fault_injected',
          `Demo: battery set to ${RULES.battery.demoInjectedPercent}%`,
          'warning',
        );
        battery = Math.min(battery, RULES.battery.demoInjectedPercent);
        lowBatteryRaised = true;
        checkBattery();
        return true;
      }
      if (linkLostRemaining !== null) return false;
      linkLostRemaining = injection.durationSeconds;
      linkLostFor = 0;
      emit('link_lost', `Drone link lost (simulated ${injection.durationSeconds} s)`, 'warning');
      return true;
    },

    snapshot,
  };
}

export type Simulator = ReturnType<typeof createSimulator>;
