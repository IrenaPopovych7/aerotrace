import { RULES } from './rules';

export type LatLon = { latitude: number; longitude: number };
export type Position3D = LatLon & { altitudeMeters: number };

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in metres (haversine). */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RULES.geo.earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Linear interpolation between two positions. Accurate enough for legs of a few kilometres,
 * which is the maximum allowed (RULES.route.maxLegMeters).
 */
export function interpolate(a: Position3D, b: Position3D, fraction: number): Position3D {
  const f = Math.min(1, Math.max(0, fraction));
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * f,
    longitude: a.longitude + (b.longitude - a.longitude) * f,
    altitudeMeters: a.altitudeMeters + (b.altitudeMeters - a.altitudeMeters) * f,
  };
}

/** Rounds half away from zero to the given number of decimals (RULES.md §1). */
export function roundHalfAway(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor;
}
