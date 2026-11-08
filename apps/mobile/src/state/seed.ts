import type { Mission, Waypoint } from '@aerotrace/contracts';

const wp = (
  id: string,
  latitude: number,
  longitude: number,
  altitudeMeters: number,
  order: number,
): Waypoint => ({
  id,
  latitude,
  longitude,
  altitudeMeters,
  order,
});

const at = '2026-11-08T12:00:00.000Z';

/** Demo missions over Parque das Nações, Lisbon (docs/decisions/0003). Simulation only. */
export function seedMissions(): Mission[] {
  return [
    {
      id: 'riverfront-survey',
      name: 'Riverfront survey',
      status: 'ready',
      createdAt: at,
      updatedAt: at,
      waypoints: [
        wp('rf-0', 38.7662, -9.0952, 30, 0),
        wp('rf-1', 38.7702, -9.0918, 40, 1),
        wp('rf-2', 38.7748, -9.0908, 55, 2),
        wp('rf-3', 38.7728, -9.0872, 60, 3),
        wp('rf-4', 38.7678, -9.0888, 45, 4),
      ],
    },
    {
      id: 'oceanario-loop',
      name: 'Oceanário loop',
      status: 'draft',
      createdAt: at,
      updatedAt: at,
      waypoints: [
        wp('oc-0', 38.7628, -9.0962, 25, 0),
        wp('oc-1', 38.7622, -9.0926, 35, 1),
        wp('oc-2', 38.7646, -9.0904, 35, 2),
      ],
    },
  ];
}
