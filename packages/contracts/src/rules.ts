/**
 * Mission and simulation constants.
 * Source of truth: docs/RULES.md. Change both in the same pull request.
 */
export const RULES = {
  route: {
    minWaypoints: 2,
    maxWaypoints: 25,
    minAltitudeMeters: 10,
    maxAltitudeMeters: 120,
    maxLegMeters: 2_000,
    maxRouteMeters: 10_000,
    duplicateToleranceMeters: 5,
  },
  flight: {
    cruiseSpeedMetersPerSecond: 10,
    climbRateMetersPerSecond: 3,
    descentRateMetersPerSecond: 2,
    hoverAtWaypointSeconds: 3,
    waypointArrivalToleranceMeters: 1,
  },
  /** Battery drain in percent per second, per flight phase. */
  batteryDrainPercentPerSecond: {
    climbing: 0.15,
    cruising: 0.07,
    hovering: 0.08,
    descending: 0.04,
  },
  battery: {
    startPercent: 100,
    reserveWarningPercent: 25,
    insufficientPercent: 10,
    lowEventPercent: 30,
    criticalEventPercent: 20,
    demoInjectedPercent: 19,
  },
  link: {
    failsafeAfterSeconds: 10,
  },
  simulator: {
    tickMilliseconds: 200,
    defaultTimeScale: 1,
    demoTimeScale: 10,
    speedJitterMetersPerSecond: 0.3,
    altitudeJitterMeters: 0.5,
  },
  geo: {
    earthRadiusMeters: 6_371_000,
  },
  demo: {
    mapCenter: { latitude: 38.7685, longitude: -9.093 },
    mapZoom: 15,
  },
} as const;
