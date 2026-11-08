import { z } from 'zod';
import { DEFAULT_UAV_ID, UavIdSchema } from './uav';

export const MissionStatusSchema = z.enum([
  'draft',
  'ready',
  'active',
  'paused',
  'returning_home',
  'completed',
  'aborted',
  'failed',
]);
export type MissionStatus = z.infer<typeof MissionStatusSchema>;

const IsoDateTime = z.iso.datetime();

export const WaypointSchema = z
  .object({
    id: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    altitudeMeters: z.number(),
    order: z.number().int().nonnegative(),
  })
  .strict();
export type Waypoint = z.infer<typeof WaypointSchema>;

export const MissionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    status: MissionStatusSchema,
    /** Airframe that flies this mission. Older missions without it use the default. */
    uavId: UavIdSchema.default(DEFAULT_UAV_ID),
    waypoints: z.array(WaypointSchema),
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
  })
  .strict();
export type Mission = z.infer<typeof MissionSchema>;

export const TelemetrySchema = z
  .object({
    missionId: z.string().min(1),
    sequence: z.number().int().positive(),
    recordedAt: IsoDateTime,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    altitudeMeters: z.number(),
    speedMetersPerSecond: z.number().nonnegative(),
    batteryPercent: z.number().min(0).max(100),
    progressPercent: z.number().min(0).max(100),
  })
  .strict();
export type Telemetry = z.infer<typeof TelemetrySchema>;

export const MissionCommandSchema = z.enum(['pause', 'resume', 'abort', 'return_home']);
export type MissionCommand = z.infer<typeof MissionCommandSchema>;

export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        fieldErrors: z.record(z.string(), z.string()).optional(),
      })
      .strict(),
  })
  .strict();
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthSchema = z
  .object({
    status: z.literal('ok'),
    service: z.literal('aerotrace-api'),
    version: z.string(),
    uptimeSeconds: z.number().nonnegative(),
    time: IsoDateTime,
  })
  .strict();
export type Health = z.infer<typeof HealthSchema>;
