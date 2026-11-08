import type { MissionEvent } from '@aerotrace/contracts';
import { View } from 'react-native';
import { formatDuration, Txt } from './primitives';
import { useTheme } from './theme';

const MARK = { info: '•', warning: '▲', critical: '◆' } as const;

export function Timeline({
  events,
  newestFirst = false,
}: {
  events: readonly MissionEvent[];
  newestFirst?: boolean;
}) {
  const t = useTheme();
  const list = newestFirst ? [...events].reverse() : events;
  return (
    <View accessibilityRole="list" style={{ gap: 6 }}>
      {list.map((e, i) => {
        const color =
          e.severity === 'critical'
            ? t.color.critical
            : e.severity === 'warning'
              ? t.color.warning
              : t.color.textMuted;
        return (
          <View key={`${e.sequence}-${e.type}-${i}`} style={{ flexDirection: 'row', gap: 10 }}>
            <Txt variant="small" style={{ width: 44, fontVariant: ['tabular-nums'] }}>
              {formatDuration(e.elapsedSeconds)}
            </Txt>
            <Txt variant="small" style={{ color, width: 14 }}>
              {MARK[e.severity]}
            </Txt>
            <Txt
              variant="body"
              style={{ flex: 1, fontSize: 14, color: e.severity === 'info' ? t.color.text : color }}
            >
              {e.message}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}
