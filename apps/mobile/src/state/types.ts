import type {
  LatLon,
  MissionEvent,
  MissionStatus,
  ReturnHomeCause,
  Waypoint,
} from '@aerotrace/contracts';

export type FlightSample = {
  elapsedSeconds: number;
  batteryPercent: number;
  altitudeMeters: number;
};

/** An immutable record written when a simulated flight reaches a terminal state. */
export type FlightReport = {
  id: string;
  missionId: string;
  missionName: string;
  status: Extract<MissionStatus, 'completed' | 'aborted' | 'failed'>;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  batteryStartPercent: number;
  batteryEndPercent: number;
  waypointsReached: number;
  waypointCount: number;
  returnHomeCause: ReturnHomeCause | null;
  waypoints: Waypoint[];
  flownPath: LatLon[];
  samples: FlightSample[];
  events: MissionEvent[];
};
