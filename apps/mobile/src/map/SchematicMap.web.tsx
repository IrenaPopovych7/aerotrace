import { RULES, type LatLon } from '@aerotrace/contracts';
import { useRef } from 'react';
import { useTheme } from '../ui/theme';
import { routeLine, type MissionMapProps } from './types';

/**
 * Offline schematic of Parque das Nações. Used when map tiles cannot load (bad Wi-Fi, or a
 * host that blocks them), so the demo never shows a blank map. Not a navigational chart.
 */
const BOUNDS = { south: 38.757, north: 38.781, west: -9.1035, east: -9.0815 };
const METERS_PER_DEG_LAT = 111_195;
const METERS_PER_DEG_LON =
  METERS_PER_DEG_LAT * Math.cos((RULES.demo.mapCenter.latitude * Math.PI) / 180);
const W = Math.round((BOUNDS.east - BOUNDS.west) * METERS_PER_DEG_LON);
const H = Math.round((BOUNDS.north - BOUNDS.south) * METERS_PER_DEG_LAT);

const x = (lon: number) => (lon - BOUNDS.west) * METERS_PER_DEG_LON;
const y = (lat: number) => (BOUNDS.north - lat) * METERS_PER_DEG_LAT;
const toLatLon = (px: number, py: number): LatLon => ({
  latitude: BOUNDS.north - py / METERS_PER_DEG_LAT,
  longitude: BOUNDS.west + px / METERS_PER_DEG_LON,
});

// Approximate Tagus (Tejo) shoreline along Parque das Nações, south → north.
const SHORE: [number, number][] = [
  [38.757, -9.0945],
  [38.761, -9.0931],
  [38.7635, -9.0921],
  [38.766, -9.0909],
  [38.7695, -9.0901],
  [38.773, -9.0897],
  [38.7765, -9.0889],
  [38.781, -9.0874],
];

const LANDMARKS: { name: string; lat: number; lon: number }[] = [
  { name: 'MEO Arena', lat: 38.7685, lon: -9.094 },
  { name: 'Oceanário', lat: 38.7635, lon: -9.0937 },
  { name: 'Gare do Oriente', lat: 38.7679, lon: -9.0991 },
];

const path = (points: readonly LatLon[]) =>
  points
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.longitude).toFixed(1)} ${y(p.latitude).toFixed(1)}`)
    .join(' ');

export function SchematicMap({
  waypoints,
  selectedId,
  onAddWaypoint,
  onSelectWaypoint,
  drone,
  flownPath,
  height,
  label,
}: MissionMapProps) {
  const t = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const ordered = [...waypoints].sort((a, b) => a.order - b.order);
  const water =
    `M${W} 0 ` +
    SHORE.slice()
      .reverse()
      .map(([lat, lon]) => `L${x(lon).toFixed(1)} ${y(lat).toFixed(1)}`)
      .join(' ') +
    ` L${W} ${H} Z`;

  const onClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!onAddWaypoint || !svgRef.current) return;
    if ((event.target as Element).closest('[data-waypoint]')) return;
    const svg = svgRef.current;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const local = pt.matrixTransform(matrix.inverse());
    onAddWaypoint(toLatLon(local.x, local.y));
  };

  const grid = [];
  for (let gx = 250; gx < W; gx += 250)
    grid.push(
      <line key={`x${gx}`} x1={gx} x2={gx} y1={0} y2={H} stroke={t.color.grid} strokeWidth={2} />,
    );
  for (let gy = 250; gy < H; gy += 250)
    grid.push(
      <line key={`y${gy}`} x1={0} x2={W} y1={gy} y2={gy} stroke={t.color.grid} strokeWidth={2} />,
    );

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${t.color.border}`,
      }}
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label={label}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        onClick={onClick}
        style={{
          display: 'block',
          cursor: onAddWaypoint ? 'crosshair' : 'default',
          background: t.color.land,
          touchAction: 'manipulation',
        }}
      >
        {grid}
        <path d={water} fill={t.color.water} />
        <text
          x={x(-9.0855)}
          y={y(38.7705)}
          fontSize={60}
          fill={t.color.textMuted}
          fontStyle="italic"
        >
          Rio Tejo
        </text>
        {LANDMARKS.map((l) => (
          <g key={l.name}>
            <rect
              x={x(l.lon) - 14}
              y={y(l.lat) - 14}
              width={28}
              height={28}
              rx={6}
              fill={t.color.surface}
              stroke={t.color.textMuted}
              strokeWidth={3}
            />
            <text
              x={x(l.lon) - 24}
              y={y(l.lat) + 14}
              textAnchor="end"
              fontSize={42}
              fill={t.color.textMuted}
            >
              {l.name}
            </text>
          </g>
        ))}
        {ordered.length > 1 && (
          <path
            d={path(routeLine(ordered))}
            fill="none"
            stroke={t.color.route}
            strokeWidth={10}
            strokeDasharray="28 18"
            strokeLinejoin="round"
          />
        )}
        {flownPath && flownPath.length > 1 && (
          <path
            d={path(flownPath)}
            fill="none"
            stroke={t.color.flown}
            strokeWidth={12}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {ordered.map((wp, i) => {
          const selected = wp.id === selectedId;
          return (
            <g
              key={wp.id}
              data-waypoint
              role="button"
              aria-label={`Waypoint ${i + 1}${i === 0 ? ', home' : ''}, ${wp.altitudeMeters} metres`}
              onClick={() => onSelectWaypoint?.(wp.id)}
              style={{ cursor: onSelectWaypoint ? 'pointer' : 'default' }}
            >
              <circle
                cx={x(wp.longitude)}
                cy={y(wp.latitude)}
                r={selected ? 46 : 38}
                fill={i === 0 ? t.color.good : t.color.route}
                stroke={t.color.surface}
                strokeWidth={8}
              />
              <text
                x={x(wp.longitude)}
                y={y(wp.latitude) + 15}
                textAnchor="middle"
                fontSize={i === 0 ? 40 : 42}
                fontWeight={700}
                fill="#fff"
              >
                {i === 0 ? 'H' : i + 1}
              </text>
            </g>
          );
        })}
        {drone && (
          <g aria-label="Drone position">
            <circle
              cx={x(drone.longitude)}
              cy={y(drone.latitude)}
              r={60}
              fill={t.color.flown}
              opacity={0.25}
            />
            <circle
              cx={x(drone.longitude)}
              cy={y(drone.latitude)}
              r={28}
              fill={t.color.flown}
              stroke="#fff"
              strokeWidth={8}
            />
          </g>
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 999,
          background: t.color.surface,
          color: t.color.textMuted,
          border: `1px solid ${t.color.border}`,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Offline schematic · grid 250 m · simulation only
      </div>
    </div>
  );
}
