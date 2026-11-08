import { describe, expect, it } from 'vitest';
import { estimateMission } from './estimate';
import { straightLine } from './fixtures';
import { RULES } from './rules';
import { createSimulator } from './simulator';
import {
  getUavProfile,
  hoverEnduranceMinutes,
  hoverPowerWatts,
  UAV_LIST,
  UAV_PROFILES,
} from './uav';

describe('UAV profiles', () => {
  it('has three airframes with 4, 6 and 8 motors, growing in size and weight', () => {
    expect(UAV_LIST.map((u) => u.motorCount)).toEqual([4, 6, 8]);
    const sizes = UAV_LIST.map((u) => u.frameDiagonalMillimeters);
    const weights = UAV_LIST.map((u) => u.takeoffWeightKilograms);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
  });

  it('keeps the default (Surveyor) identical to the original rules', () => {
    const s = UAV_PROFILES.surveyor;
    expect(s.cruiseSpeedMetersPerSecond).toBe(RULES.flight.cruiseSpeedMetersPerSecond);
    expect(s.batteryDrainPercentPerSecond).toEqual(RULES.batteryDrainPercentPerSecond);
    expect(estimateMission(straightLine)).toEqual(estimateMission(straightLine, s));
  });

  it('falls back to the default for missing or unknown ids', () => {
    expect(getUavProfile(undefined).id).toBe('surveyor');
    expect(getUavProfile('jumbo').id).toBe('surveyor');
  });

  it('derives plausible hover power and endurance', () => {
    for (const uav of UAV_LIST) {
      const wattsPerKg = hoverPowerWatts(uav) / uav.takeoffWeightKilograms;
      expect(wattsPerKg).toBeGreaterThan(150);
      expect(wattsPerKg).toBeLessThan(300);
      expect(hoverEnduranceMinutes(uav)).toBeGreaterThan(10);
      expect(hoverEnduranceMinutes(uav)).toBeLessThan(30);
    }
  });

  it('changes the estimate per airframe: Scout fastest, Hauler slowest', () => {
    const [scout, surveyor, hauler] = UAV_LIST.map((u) => estimateMission(straightLine, u));
    expect(scout!.durationSeconds).toBeLessThan(surveyor!.durationSeconds);
    expect(hauler!.durationSeconds).toBeGreaterThan(surveyor!.durationSeconds);
    // Same path, so the same distance.
    expect(new Set([scout, surveyor, hauler].map((e) => e!.distanceMeters)).size).toBe(1);
  });

  it('the simulator flies with the mission UAV and agrees with its estimate', () => {
    for (const uav of UAV_LIST) {
      const sim = createSimulator({
        mission: { id: `m-${uav.id}`, waypoints: straightLine, uavId: uav.id },
        seed: 3,
        startedAt: '2026-11-09T10:00:00.000Z',
      });
      let snap = sim.snapshot();
      while (snap.status !== 'completed' && snap.elapsedSeconds < 3600) snap = sim.advance(1);
      const estimate = estimateMission(straightLine, uav);
      expect(snap.status).toBe('completed');
      expect(Math.abs(snap.elapsedSeconds - estimate.durationSeconds)).toBeLessThanOrEqual(1);
      expect(
        Math.abs(snap.telemetry.batteryPercent - estimate.batteryRemainingPercent),
      ).toBeLessThan(0.5);
    }
  });
});
