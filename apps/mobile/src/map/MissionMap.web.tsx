import { RULES } from '@aerotrace/contracts';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../ui/theme';
import { SchematicMap } from './SchematicMap.web';
import { routeLine, type MissionMapProps } from './types';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const LOAD_TIMEOUT_MS = 6000;

/** Remembered across screens: once tiles fail, stay on the schematic for this session. */
let tilesUnavailable = false;

const lineFeature = (coords: number[][]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: coords },
});

export function MissionMap(props: MissionMapProps) {
  const [fallback, setFallback] = useState(tilesUnavailable);
  if (fallback) return <SchematicMap {...props} />;
  return (
    <LiveMap
      {...props}
      onFail={() => {
        tilesUnavailable = true;
        setFallback(true);
      }}
    />
  );
}

function LiveMap({
  waypoints,
  selectedId,
  onAddWaypoint,
  onSelectWaypoint,
  drone,
  flownPath,
  height,
  label,
  onFail,
}: MissionMapProps & { onFail: () => void }) {
  const t = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const droneMarker = useRef<Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const handlers = useRef({
    onAddWaypoint,
    onSelectWaypoint,
    initialPoints: [...waypoints, ...(flownPath ?? [])],
  });
  handlers.current = { ...handlers.current, onAddWaypoint, onSelectWaypoint };

  useEffect(() => {
    if (!container.current) return;
    let done = false;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: STYLE_URL,
        center: [RULES.demo.mapCenter.longitude, RULES.demo.mapCenter.latitude],
        zoom: RULES.demo.mapZoom,
        attributionControl: { compact: true },
      });
    } catch {
      onFail();
      return;
    }
    mapRef.current = map;
    const timer = setTimeout(() => !done && onFail(), LOAD_TIMEOUT_MS);
    map.on('error', () => !done && onFail());
    map.on('load', () => {
      done = true;
      clearTimeout(timer);
      map.addSource('route', { type: 'geojson', data: lineFeature([]) });
      map.addSource('flown', { type: 'geojson', data: lineFeature([]) });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': t.color.route, 'line-width': 3, 'line-dasharray': [2, 1.5] },
      });
      map.addLayer({
        id: 'flown',
        type: 'line',
        source: 'flown',
        paint: { 'line-color': t.color.flown, 'line-width': 4 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      const pts = handlers.current.initialPoints;
      if (pts.length > 1) {
        const lons = pts.map((p) => p.longitude);
        const lats = pts.map((p) => p.latitude);
        map.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: 48, duration: 0, maxZoom: 16.5 },
        );
      }
      setLoaded(true);
    });
    map.on('click', (e) =>
      handlers.current.onAddWaypoint?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }),
    );
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; props are synced by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const ordered = [...waypoints].sort((a, b) => a.order - b.order);
    (map.getSource('route') as GeoJSONSource).setData(
      lineFeature(routeLine(ordered).map((p) => [p.longitude, p.latitude])),
    );
    markers.current.forEach((m) => m.remove());
    markers.current = ordered.map((wp, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = i === 0 ? 'H' : String(i + 1);
      el.setAttribute(
        'aria-label',
        `Waypoint ${i + 1}${i === 0 ? ', home' : ''}, ${wp.altitudeMeters} metres`,
      );
      const size = wp.id === selectedId ? 34 : 28;
      Object.assign(el.style, {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '3px solid #fff',
        background: i === 0 ? t.color.good : t.color.route,
        color: '#fff',
        fontWeight: '700',
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,.35)',
      });
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        handlers.current.onSelectWaypoint?.(wp.id);
      });
      return new maplibregl.Marker({ element: el })
        .setLngLat([wp.longitude, wp.latitude])
        .addTo(map);
    });
  }, [waypoints, selectedId, loaded, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (map.getSource('flown') as GeoJSONSource).setData(
      lineFeature((flownPath ?? []).map((p) => [p.longitude, p.latitude])),
    );
    if (drone) {
      if (!droneMarker.current) {
        const el = document.createElement('div');
        el.setAttribute('aria-label', 'Drone position');
        Object.assign(el.style, {
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: t.color.flown,
          border: '4px solid #fff',
          boxShadow: `0 0 0 8px ${t.color.flown}40`,
        });
        droneMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([drone.longitude, drone.latitude])
          .addTo(map);
      } else {
        droneMarker.current.setLngLat([drone.longitude, drone.latitude]);
      }
    } else if (droneMarker.current) {
      droneMarker.current.remove();
      droneMarker.current = null;
    }
  }, [drone, flownPath, loaded, t]);

  return (
    <div
      role="application"
      aria-label={label}
      style={{
        position: 'relative',
        height,
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${t.color.border}`,
      }}
    >
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
