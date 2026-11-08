import { describe, expect, it } from 'vitest';
import { estimateMission } from './estimate';
import { straightLine } from './fixtures';
import { createSimulator } from './simulator';

const mission = { id: 'msn_test', waypoints: straightLine };
const startedAt = '2026-11-09T10:00:00.000Z';
const make = (seed = 42) => createSimulator({ mission, seed, startedAt });

function runToEnd(sim: ReturnType<typeof make>) {
  let snap = sim.snapshot();
  for (let i = 0; i < 10_000 && !['completed', 'aborted', 'failed'].includes(snap.status); i++) {
    snap = sim.advance(1);
  }
  return snap;
}

describe('createSimulator', () => {
  it('is deterministic for the same seed', () => {
    const a = runToEnd(make(7));
    const b = runToEnd(make(7));
    expect(a.history).toEqual(b.history);
    expect(a.events).toEqual(b.events);
  });

  it('only changes cosmetic jitter with a different seed', () => {
    const a = runToEnd(make(1));
    const b = runToEnd(make(2));
    expect(a.status).toBe(b.status);
    expect(a.telemetry.batteryPercent).toBe(b.telemetry.batteryPercent);
    expect(a.history).not.toEqual(b.history);
  });

  it('completes the route and agrees with the estimate', () => {
    const end = runToEnd(make());
    const estimate = estimateMission(straightLine);
    expect(end.status).toBe('completed');
    expect(end.waypointsReached).toBe(1);
    expect(Math.abs(end.elapsedSeconds - estimate.durationSeconds)).toBeLessThanOrEqual(1);
    expect(Math.abs(end.telemetry.batteryPercent - estimate.batteryRemainingPercent)).toBeLessThan(
      0.5,
    );
    expect(
      Math.abs(end.distanceFlownMeters - estimate.distanceMeters) / estimate.distanceMeters,
    ).toBeLessThan(0.02);
    expect(end.telemetry.progressPercent).toBe(100);
    expect(end.events.map((e) => e.type)).toEqual([
      'takeoff',
      'waypoint_reached',
      'return_home_started',
      'landed',
      'completed',
    ]);
  });

  it('emits strictly increasing sequence numbers', () => {
    const end = runToEnd(make());
    const sequences = end.history.map((t) => t.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    expect(new Set(sequences).size).toBe(sequences.length);
  });

  it('pauses in place and drains battery at the hover rate', () => {
    const sim = make();
    const before = sim.advance(30);
    expect(sim.command('pause')).toBe(true);
    const after = sim.advance(10);
    expect(after.status).toBe('paused');
    expect(after.telemetry.latitude).toBeCloseTo(before.telemetry.latitude, 9);
    expect(before.telemetry.batteryPercent - after.telemetry.batteryPercent).toBeCloseTo(0.8, 1);
    expect(sim.command('pause')).toBe(false);
    expect(sim.command('resume')).toBe(true);
  });

  it('injected low battery triggers an automatic return home and ends aborted', () => {
    const sim = make();
    sim.advance(30);
    sim.inject({ type: 'low_battery' });
    const snap = sim.snapshot();
    expect(snap.status).toBe('returning_home');
    expect(snap.returnHomeCause).toBe('battery');
    const end = runToEnd(sim);
    expect(end.status).toBe('aborted');
    expect(end.events.map((e) => e.type)).toContain('critical_battery');
  });

  it('recovers from a short link loss and fails safe after 10 s', () => {
    const short = make();
    short.advance(20);
    short.inject({ type: 'link_loss', durationSeconds: 5 });
    const recovered = short.advance(6);
    expect(recovered.linkLost).toBe(false);
    expect(recovered.status).toBe('active');
    expect(recovered.events.map((e) => e.type)).toContain('link_restored');

    const long = make();
    long.advance(20);
    long.inject({ type: 'link_loss', durationSeconds: 15 });
    const failsafe = long.advance(11);
    expect(failsafe.status).toBe('returning_home');
    expect(failsafe.returnHomeCause).toBe('link');
  });

  it('abort lands in place and rejects further commands', () => {
    const sim = make();
    const mid = sim.advance(40);
    expect(sim.command('abort')).toBe(true);
    expect(sim.command('pause')).toBe(false);
    const end = runToEnd(sim);
    expect(end.status).toBe('aborted');
    expect(end.telemetry.latitude).toBeCloseTo(mid.telemetry.latitude, 9);
    expect(end.telemetry.altitudeMeters).toBe(0);
  });

  it('operator return home before the last waypoint ends aborted', () => {
    const sim = make();
    sim.advance(20);
    expect(sim.command('return_home')).toBe(true);
    expect(runToEnd(sim).status).toBe('aborted');
  });
});
