import { Text, View } from 'react-native';
import { useTheme } from '../ui/theme';
import type { MissionMapProps } from './types';

/**
 * Native placeholder. The MapLibre native map arrives with the Expo development build
 * (backlog #12, docs/decisions/0002). The web build uses MissionMap.web.tsx.
 */
export function MissionMap({ height, label, waypoints }: MissionMapProps) {
  const t = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={{
        height,
        borderRadius: t.radius.lg,
        backgroundColor: t.color.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: t.color.textMuted }}>
        Map available on web · {waypoints.length} waypoints
      </Text>
    </View>
  );
}
