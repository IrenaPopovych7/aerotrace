import type { MissionStatus } from '@aerotrace/contracts';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

type TxtProps = {
  children: ReactNode;
  variant?: 'title' | 'heading' | 'body' | 'muted' | 'small' | 'value';
  style?: StyleProp<TextStyle>;
  role?: 'header';
};

export function Txt({ children, variant = 'body', style, role }: TxtProps) {
  const t = useTheme();
  const variants: Record<NonNullable<TxtProps['variant']>, TextStyle> = {
    title: { fontSize: t.font.xl, fontWeight: '700', color: t.color.text },
    heading: { fontSize: t.font.lg, fontWeight: '600', color: t.color.text },
    body: { fontSize: t.font.md, color: t.color.text },
    muted: { fontSize: t.font.sm, color: t.color.textMuted },
    small: { fontSize: t.font.xs, color: t.color.textMuted },
    value: {
      fontSize: t.font.xl,
      fontWeight: '700',
      color: t.color.text,
      fontVariant: ['tabular-nums'],
    },
  };
  const base = variants[variant];
  return (
    <Text accessibilityRole={role} style={[base, style]}>
      {children}
    </Text>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled,
  loading,
  accessibilityHint,
  style,
  compact,
}: ButtonProps) {
  const t = useTheme();
  const palette = {
    primary: { bg: t.color.accent, fg: t.color.accentText, border: t.color.accent },
    secondary: { bg: t.color.surface, fg: t.color.text, border: t.color.border },
    danger: { bg: t.color.criticalBg, fg: t.color.critical, border: t.color.critical },
    ghost: { bg: 'transparent', fg: t.color.accent, border: 'transparent' },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: off ? 0.45 : pressed ? 0.75 : 1,
          borderRadius: t.radius.md,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text
          style={{
            color: palette.fg,
            fontWeight: '600',
            fontSize: compact ? t.font.sm : t.font.md,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.color.surface,
          borderColor: t.color.border,
          borderWidth: 1,
          borderRadius: t.radius.lg,
          padding: t.space.lg,
          gap: t.space.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = 8,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: 'wrap' }, style]}>
      {children}
    </View>
  );
}

export const STATUS_LABEL: Record<MissionStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  active: 'Flying',
  paused: 'Paused',
  returning_home: 'Returning home',
  completed: 'Completed',
  aborted: 'Aborted',
  failed: 'Failed',
};

const STATUS_ICON: Record<MissionStatus, string> = {
  draft: '✎',
  ready: '✓',
  active: '▶',
  paused: '❚❚',
  returning_home: '⌂',
  completed: '✓',
  aborted: '■',
  failed: '✕',
};

/** Status shown as icon + word, never colour alone. */
export function StatusBadge({ status }: { status: MissionStatus }) {
  const t = useTheme();
  const tone =
    status === 'completed' || status === 'ready'
      ? { fg: t.color.good, bg: t.color.goodBg }
      : status === 'failed'
        ? { fg: t.color.critical, bg: t.color.criticalBg }
        : status === 'aborted' || status === 'returning_home' || status === 'paused'
          ? { fg: t.color.warning, bg: t.color.warningBg }
          : status === 'active'
            ? { fg: t.color.accent, bg: t.color.surfaceAlt }
            : { fg: t.color.textMuted, bg: t.color.surfaceAlt };
  return (
    <View
      accessibilityLabel={`Status: ${STATUS_LABEL[status]}`}
      style={[styles.badge, { backgroundColor: tone.bg, borderRadius: t.radius.pill }]}
    >
      <Text style={{ color: tone.fg, fontSize: t.font.xs, fontWeight: '700' }}>
        {STATUS_ICON[status]} {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: 'warning' | 'critical' | 'info';
  children: ReactNode;
}) {
  const t = useTheme();
  const c =
    tone === 'critical'
      ? { fg: t.color.critical, bg: t.color.criticalBg, label: 'Error' }
      : tone === 'warning'
        ? { fg: t.color.warning, bg: t.color.warningBg, label: 'Warning' }
        : { fg: t.color.accent, bg: t.color.surfaceAlt, label: 'Info' };
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: c.bg,
        borderRadius: t.radius.md,
        padding: t.space.md,
        borderLeftWidth: 4,
        borderLeftColor: c.fg,
      }}
    >
      <Text style={{ color: t.color.text, fontSize: t.font.sm }}>
        <Text style={{ color: c.fg, fontWeight: '700' }}>{c.label}: </Text>
        {children}
      </Text>
    </View>
  );
}

export function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'warning' | 'critical';
}) {
  const t = useTheme();
  const color =
    tone === 'critical' ? t.color.critical : tone === 'warning' ? t.color.warning : t.color.text;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      style={[styles.stat, { backgroundColor: t.color.surfaceAlt, borderRadius: t.radius.md }]}
    >
      <Text style={{ color: t.color.textMuted, fontSize: t.font.xs }}>{label}</Text>
      <Text
        style={{ color, fontSize: t.font.xl, fontWeight: '700', fontVariant: ['tabular-nums'] }}
      >
        {value}
        {unit ? <Text style={{ fontSize: t.font.sm, fontWeight: '500' }}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

const styles = StyleSheet.create({
  screenContent: { padding: 16, paddingBottom: 48, alignItems: 'center' },
  column: { width: '100%', maxWidth: 560, gap: 16 },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  stat: { flexGrow: 1, flexBasis: '30%', minWidth: 100, padding: 12, gap: 2 },
});
