import { z } from 'zod';
import { RULES } from './rules';

export const UavIdSchema = z.enum(['scout', 'surveyor', 'hauler']);
export type UavId = z.infer<typeof UavIdSchema>;

export type UavProfile = {
  id: UavId;
  name: string;
  summary: string;
  airframe: 'quadcopter' | 'hexacopter' | 'octocopter';
  motorCount: 4 | 6 | 8;
  /** Motor-to-motor diagonal, the usual way multirotor size is quoted. */
  frameDiagonalMillimeters: number;
  takeoffWeightKilograms: number;
  batteryCapacityWattHours: number;
  cruiseSpeedMetersPerSecond: number;
  climbRateMetersPerSecond: number;
  descentRateMetersPerSecond: number;
  /** Battery drain in percent per second, per flight phase. */
  batteryDrainPercentPerSecond: {
    climbing: number;
    cruising: number;
    hovering: number;
    descending: number;
  };
};

/**
 * Three generic airframe classes (not real products). Source of truth: docs/RULES.md §3.1.
 * `surveyor` uses the original RULES numbers, so it is the default and keeps old missions
 * flying exactly as before.
 */
export const UAV_PROFILES: Record<UavId, UavProfile> = {
  scout: {
    id: 'scout',
    name: 'Scout',
    summary: 'Small, fast quadcopter for quick inspection. Short endurance.',
    airframe: 'quadcopter',
    motorCount: 4,
    frameDiagonalMillimeters: 250,
    takeoffWeightKilograms: 0.55,
    batteryCapacityWattHours: 33,
    cruiseSpeedMetersPerSecond: 14,
    climbRateMetersPerSecond: 5,
    descentRateMetersPerSecond: 3,
    batteryDrainPercentPerSecond: {
      climbing: 0.22,
      cruising: 0.11,
      hovering: 0.12,
      descending: 0.06,
    },
  },
  surveyor: {
    id: 'surveyor',
    name: 'Surveyor',
    summary: 'Mid-size hexacopter for mapping. Balanced speed and endurance.',
    airframe: 'hexacopter',
    motorCount: 6,
    frameDiagonalMillimeters: 690,
    takeoffWeightKilograms: 3.2,
    batteryCapacityWattHours: 222,
    cruiseSpeedMetersPerSecond: RULES.flight.cruiseSpeedMetersPerSecond,
    climbRateMetersPerSecond: RULES.flight.climbRateMetersPerSecond,
    descentRateMetersPerSecond: RULES.flight.descentRateMetersPerSecond,
    batteryDrainPercentPerSecond: { ...RULES.batteryDrainPercentPerSecond },
  },
  hauler: {
    id: 'hauler',
    name: 'Hauler',
    summary: 'Large octocopter for heavy payloads. Slow climb, steady in flight.',
    airframe: 'octocopter',
    motorCount: 8,
    frameDiagonalMillimeters: 1250,
    takeoffWeightKilograms: 14,
    batteryCapacityWattHours: 1000,
    cruiseSpeedMetersPerSecond: 8,
    climbRateMetersPerSecond: 2.5,
    descentRateMetersPerSecond: 1.5,
    batteryDrainPercentPerSecond: {
      climbing: 0.13,
      cruising: 0.07,
      hovering: 0.075,
      descending: 0.045,
    },
  },
};

export const DEFAULT_UAV_ID: UavId = 'surveyor';
export const UAV_LIST: UavProfile[] = [
  UAV_PROFILES.scout,
  UAV_PROFILES.surveyor,
  UAV_PROFILES.hauler,
];

/** Resolves a stored id (possibly missing, from older saved missions) to a profile. */
export function getUavProfile(id: string | undefined | null): UavProfile {
  return UAV_PROFILES[(id ?? DEFAULT_UAV_ID) as UavId] ?? UAV_PROFILES[DEFAULT_UAV_ID];
}

/** Average electrical power while hovering, in watts: drain × capacity. */
export function hoverPowerWatts(profile: UavProfile): number {
  return (
    (profile.batteryDrainPercentPerSecond.hovering / 100) * profile.batteryCapacityWattHours * 3600
  );
}

/** Minutes from a full battery to empty while hovering. */
export function hoverEnduranceMinutes(profile: UavProfile): number {
  return 100 / profile.batteryDrainPercentPerSecond.hovering / 60;
}
