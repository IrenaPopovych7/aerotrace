import { describe, expect, it } from 'vitest';
import { estimateMission } from './estimate';
import { straightLine } from './fixtures';
import type { Waypoint } from './schemas';

describe('estimateMission', () => {
  it('matches a hand calculation for a straight out-and-back route', () => {
    // climb 30 m (10 s) + cruise 1000 m (100 s) + hover 3 s + cruise back (100 s) + land 30 m (15 s)
    const estimate = estimateMission(straightLine);
    expect(estimate.distanceMeters).toBe(2060);
    expect(estimate.durationSeconds).toBe(228);
    // 10*0.15 + 200*0.07 + 3*0.08 + 15*0.04 = 1.5 + 14 + 0.24 + 0.6 = 16.34
    expect(estimate.batteryUsedPercent).toBe(16.3);
    expect(estimate.batteryRemainingPercent).toBe(83.7);
    expect(estimate.canBeReady).toBe(true);
    expect(estimate.issues).toEqual([]);
  });

  it('needs at least two waypoints', () => {
    const estimate = estimateMission(straightLine.slice(0, 1));
    expect(estimate.canBeReady).toBe(false);
    expect(estimate.issues.map((i) => i.code)).toContain('too_few_waypoints');
  });

  it('flags altitude outside 10–120 m with the field path', () => {
    const high = straightLine.map((wp, i) => (i === 1 ? { ...wp, altitudeMeters: 150 } : wp));
    const issue = estimateMission(high).issues.find((i) => i.code === 'altitude_out_of_range');
    expect(issue?.field).toBe('waypoints.1.altitudeMeters');
  });

  it('rejects legs longer than 2 km', () => {
    const far: Waypoint[] = [
      straightLine[0]!,
      { ...straightLine[1]!, latitude: 38.7685 + 2500 / 111_194.93 },
    ];
    expect(estimateMission(far).issues.map((i) => i.code)).toContain('leg_too_long');
  });

  it('warns below 25% reserve and blocks below 10%, consistently with the estimate', () => {
    // Waypoints 50 m apart that alternate between 10 m and 120 m: climbs drain fast.
    const tower = (count: number): Waypoint[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `wp${i}`,
        latitude: 38.7685,
        longitude: -9.093 + i * (50 / 86_700),
        altitudeMeters: i % 2 ? 120 : 10,
        order: i,
      }));
    const seen = new Set<string>();
    for (let count = 2; count <= 25; count++) {
      const estimate = estimateMission(tower(count));
      const codes = estimate.issues.map((i) => i.code);
      const remaining = estimate.batteryRemainingPercent;
      expect(codes.includes('battery_insufficient')).toBe(remaining < 10);
      expect(codes.includes('battery_reserve_low')).toBe(remaining >= 10 && remaining < 25);
      expect(estimate.canBeReady).toBe(remaining >= 10);
      codes.forEach((c) => seen.add(c));
    }
    // The sweep must actually cross both thresholds.
    expect(seen).toContain('battery_reserve_low');
    expect(seen).toContain('battery_insufficient');
  });
});
