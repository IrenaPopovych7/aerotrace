import type { Waypoint } from './schemas';

/** Two points 1 000 m apart due north (0.0089932° of latitude ≈ 1 000 m). */
export const straightLine: Waypoint[] = [
  { id: 'home', latitude: 38.7685, longitude: -9.093, altitudeMeters: 30, order: 0 },
  {
    id: 'north',
    latitude: 38.7685 + 1000 / 111_194.93,
    longitude: -9.093,
    altitudeMeters: 30,
    order: 1,
  },
];
