import type { LatLon, Waypoint } from '@aerotrace/contracts';

export type MissionMapProps = {
  waypoints: readonly Waypoint[];
  selectedId?: string | null;
  onAddWaypoint?: (point: LatLon) => void;
  onSelectWaypoint?: (id: string) => void;
  drone?: LatLon | null;
  flownPath?: readonly LatLon[];
  height: number;
  /** Accessible description of what the map shows. */
  label: string;
};

/** Route drawn as a closed loop: home → waypoints → home. */
export function routeLine(waypoints: readonly Waypoint[]): LatLon[] {
  const ordered = [...waypoints].sort((a, b) => a.order - b.order);
  return ordered.length > 1 ? [...ordered, ordered[0]!] : ordered;
}
