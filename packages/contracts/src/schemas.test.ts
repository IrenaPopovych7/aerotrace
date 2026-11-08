import { describe, expect, it } from 'vitest';
import { MissionSchema, TelemetrySchema } from './schemas';

const validMission = {
  id: 'msn_riverfront',
  name: 'Riverfront loop',
  status: 'draft',
  waypoints: [
    { id: 'wp_0', latitude: 38.7685, longitude: -9.093, altitudeMeters: 30, order: 0 },
    { id: 'wp_1', latitude: 38.7712, longitude: -9.0905, altitudeMeters: 40, order: 1 },
  ],
  createdAt: '2026-11-08T10:00:00.000Z',
  updatedAt: '2026-11-08T10:00:00.000Z',
};

describe('MissionSchema', () => {
  it('accepts a valid mission and defaults the UAV for older missions', () => {
    expect(MissionSchema.parse(validMission)).toEqual({ ...validMission, uavId: 'surveyor' });
  });

  it('rejects an unknown UAV type', () => {
    expect(MissionSchema.safeParse({ ...validMission, uavId: 'jumbo' }).success).toBe(false);
  });

  it('rejects unexpected fields', () => {
    expect(MissionSchema.safeParse({ ...validMission, owner: 'someone' }).success).toBe(false);
  });

  it('rejects out-of-range coordinates', () => {
    const bad = {
      ...validMission,
      waypoints: [{ id: 'wp_0', latitude: 91, longitude: 0, altitudeMeters: 30, order: 0 }],
    };
    expect(MissionSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects non-ISO timestamps', () => {
    expect(MissionSchema.safeParse({ ...validMission, createdAt: 'yesterday' }).success).toBe(
      false,
    );
  });
});

describe('TelemetrySchema', () => {
  it('rejects battery above 100 percent', () => {
    const result = TelemetrySchema.safeParse({
      missionId: 'msn_1',
      sequence: 1,
      recordedAt: '2026-11-08T10:00:00.000Z',
      latitude: 38.7,
      longitude: -9.09,
      altitudeMeters: 20,
      speedMetersPerSecond: 10,
      batteryPercent: 101,
      progressPercent: 0,
    });
    expect(result.success).toBe(false);
  });
});
