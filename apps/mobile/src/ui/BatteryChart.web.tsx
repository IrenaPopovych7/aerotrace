import { RULES } from '@aerotrace/contracts';
import type { FlightSample } from '../state/types';
import { formatDuration } from './primitives';
import { useTheme } from './theme';

const W = 520;
const H = 200;
const PAD = { left: 40, right: 16, top: 12, bottom: 28 };

/** Battery over time with the low (30%) and critical (20%) thresholds marked. */
export function BatteryChart({ samples }: { samples: FlightSample[] }) {
  const t = useTheme();
  const end = Math.max(1, samples.at(-1)?.elapsedSeconds ?? 1);
  const X = (s: number) => PAD.left + (s / end) * (W - PAD.left - PAD.right);
  const Y = (p: number) => PAD.top + (1 - p / 100) * (H - PAD.top - PAD.bottom);
  const line = samples
    .map(
      (s, i) =>
        `${i ? 'L' : 'M'}${X(s.elapsedSeconds).toFixed(1)} ${Y(s.batteryPercent).toFixed(1)}`,
    )
    .join(' ');
  const first = samples[0]?.batteryPercent ?? 100;
  const last = samples.at(-1)?.batteryPercent ?? first;
  const font = { fontFamily: 'system-ui, sans-serif', fontSize: 11 };

  return (
    <svg
      role="img"
      aria-label={`Battery fell from ${first}% to ${last}% over ${formatDuration(end)}`}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block' }}
    >
      {[0, 25, 50, 75, 100].map((p) => (
        <g key={p}>
          <line x1={PAD.left} x2={W - PAD.right} y1={Y(p)} y2={Y(p)} stroke={t.color.grid} />
          <text x={PAD.left - 6} y={Y(p) + 4} textAnchor="end" fill={t.color.textMuted} {...font}>
            {p}%
          </text>
        </g>
      ))}
      {[
        { p: RULES.battery.lowEventPercent, label: 'low', color: t.color.warning },
        { p: RULES.battery.criticalEventPercent, label: 'critical', color: t.color.critical },
      ].map(({ p, label, color }) => (
        <g key={label}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={Y(p)}
            y2={Y(p)}
            stroke={color}
            strokeDasharray="4 4"
          />
          <text x={W - PAD.right} y={Y(p) - 4} textAnchor="end" fill={color} {...font}>
            {label} {p}%
          </text>
        </g>
      ))}
      <path d={line} fill="none" stroke={t.color.accent} strokeWidth={2.5} strokeLinejoin="round" />
      <text x={PAD.left} y={H - 8} fill={t.color.textMuted} {...font}>
        0:00
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" fill={t.color.textMuted} {...font}>
        {formatDuration(end)} (simulated time)
      </text>
    </svg>
  );
}
