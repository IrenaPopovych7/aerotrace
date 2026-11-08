import type { MissionStatus } from './schemas';

/**
 * Reasons a mission can change state. Operator commands and system triggers are kept
 * separate so the API can reject a system-only trigger sent by a client.
 * See docs/RULES.md §5.
 */
export type MissionTrigger =
  | 'mark_ready'
  | 'edit'
  | 'start'
  | 'pause'
  | 'resume'
  | 'return_home'
  | 'abort'
  | 'failsafe_return_home'
  | 'route_finished'
  | 'landed_all_reached'
  | 'landed_incomplete'
  | 'battery_depleted'
  | 'simulator_error';

type Transitions = Partial<Record<MissionTrigger, MissionStatus>>;

const IN_FLIGHT_FAILURES: Transitions = {
  abort: 'aborted',
  battery_depleted: 'failed',
  simulator_error: 'failed',
};

export const MISSION_TRANSITIONS: Record<MissionStatus, Transitions> = {
  draft: { mark_ready: 'ready' },
  ready: { edit: 'draft', start: 'active' },
  active: {
    ...IN_FLIGHT_FAILURES,
    pause: 'paused',
    return_home: 'returning_home',
    failsafe_return_home: 'returning_home',
    route_finished: 'returning_home',
  },
  paused: {
    ...IN_FLIGHT_FAILURES,
    resume: 'active',
    return_home: 'returning_home',
    failsafe_return_home: 'returning_home',
  },
  returning_home: {
    ...IN_FLIGHT_FAILURES,
    landed_all_reached: 'completed',
    landed_incomplete: 'aborted',
  },
  completed: {},
  aborted: {},
  failed: {},
};

export const TERMINAL_STATUSES: ReadonlySet<MissionStatus> = new Set([
  'completed',
  'aborted',
  'failed',
]);

export function nextStatus(from: MissionStatus, trigger: MissionTrigger): MissionStatus | null {
  return MISSION_TRANSITIONS[from][trigger] ?? null;
}

export function canTransition(from: MissionStatus, trigger: MissionTrigger): boolean {
  return nextStatus(from, trigger) !== null;
}

export function isTerminal(status: MissionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function isEditable(status: MissionStatus): boolean {
  return status === 'draft' || status === 'ready';
}
