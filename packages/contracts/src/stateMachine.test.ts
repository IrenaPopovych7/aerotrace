import { describe, expect, it } from 'vitest';
import {
  MISSION_TRANSITIONS,
  canTransition,
  isEditable,
  isTerminal,
  nextStatus,
} from './stateMachine';
import { MissionStatusSchema } from './schemas';

describe('mission state machine', () => {
  it('follows the happy path from draft to completed', () => {
    expect(nextStatus('draft', 'mark_ready')).toBe('ready');
    expect(nextStatus('ready', 'start')).toBe('active');
    expect(nextStatus('active', 'pause')).toBe('paused');
    expect(nextStatus('paused', 'resume')).toBe('active');
    expect(nextStatus('active', 'route_finished')).toBe('returning_home');
    expect(nextStatus('returning_home', 'landed_all_reached')).toBe('completed');
  });

  it('sends a ready mission back to draft when edited', () => {
    expect(nextStatus('ready', 'edit')).toBe('draft');
  });

  it('ends early returns as aborted, not completed', () => {
    expect(nextStatus('returning_home', 'landed_incomplete')).toBe('aborted');
  });

  it('rejects commands that are invalid for the current state', () => {
    expect(canTransition('draft', 'start')).toBe(false);
    expect(canTransition('paused', 'pause')).toBe(false);
    expect(canTransition('returning_home', 'resume')).toBe(false);
  });

  it('allows nothing out of terminal states', () => {
    for (const status of ['completed', 'aborted', 'failed'] as const) {
      expect(isTerminal(status)).toBe(true);
      expect(Object.keys(MISSION_TRANSITIONS[status])).toHaveLength(0);
    }
  });

  it('only lets draft and ready missions be edited', () => {
    const editable = MissionStatusSchema.options.filter(isEditable);
    expect(editable).toEqual(['draft', 'ready']);
  });

  it('can always abort or fail while in flight', () => {
    for (const status of ['active', 'paused', 'returning_home'] as const) {
      expect(nextStatus(status, 'abort')).toBe('aborted');
      expect(nextStatus(status, 'battery_depleted')).toBe('failed');
    }
  });
});
