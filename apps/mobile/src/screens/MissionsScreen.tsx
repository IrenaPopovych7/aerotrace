import { estimateMission, type MissionStatus } from '@aerotrace/contracts';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Route } from '../navigation';
import { useStore } from '../state/store';
import {
  Button,
  Card,
  formatDistance,
  formatDuration,
  Row,
  Screen,
  StatusBadge,
  Txt,
} from '../ui/primitives';
import { useTheme } from '../ui/theme';

const FILTERS: { label: string; match: (s: MissionStatus) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'Draft', match: (s) => s === 'draft' },
  { label: 'Ready', match: (s) => s === 'ready' },
  { label: 'Completed', match: (s) => s === 'completed' },
  { label: 'Aborted / failed', match: (s) => s === 'aborted' || s === 'failed' },
];

export function MissionsScreen({ navigate }: { navigate: (r: Route) => void }) {
  const t = useTheme();
  const { missions, flights, createMission, resetDemo } = useStore();
  const [filter, setFilter] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const visible = missions.filter((m) => FILTERS[filter]!.match(m.status));

  return (
    <Screen>
      <View style={{ gap: 4, paddingTop: 8 }}>
        <Txt variant="title" role="header">
          AeroTrace
        </Txt>
        <Txt variant="muted">
          Plan a drone mission, fly it in a deterministic simulator, review the flight.
        </Txt>
      </View>

      <Row>
        {FILTERS.map((f, i) => (
          <Pressable
            key={f.label}
            accessibilityRole="button"
            accessibilityState={{ selected: i === filter }}
            onPress={() => setFilter(i)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: t.radius.pill,
              borderWidth: 1,
              borderColor: i === filter ? t.color.accent : t.color.border,
              backgroundColor: i === filter ? t.color.accent : t.color.surface,
            }}
          >
            <Txt
              variant="small"
              style={{ color: i === filter ? t.color.accentText : t.color.text, fontWeight: '600' }}
            >
              {f.label}
            </Txt>
          </Pressable>
        ))}
      </Row>

      <Button
        label="+ New mission"
        variant="primary"
        onPress={() => navigate({ name: 'plan', id: createMission().id })}
      />

      {visible.length === 0 ? (
        <Card>
          <Txt variant="muted">No missions in this state yet.</Txt>
        </Card>
      ) : (
        visible.map((m) => {
          const est = estimateMission(m.waypoints);
          const flight = flights.find((f) => f.missionId === m.id);
          const flown = flight !== undefined;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`${m.name}, ${m.waypoints.length} waypoints`}
              onPress={() =>
                navigate(flown ? { name: 'report', id: flight.id } : { name: 'plan', id: m.id })
              }
            >
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="heading">{m.name}</Txt>
                  <StatusBadge status={m.status} />
                </Row>
                <Txt variant="muted">
                  {m.waypoints.length} waypoints
                  {m.waypoints.length > 1
                    ? ` · ${formatDistance(est.distanceMeters)} · ${formatDuration(est.durationSeconds)} · lands at ${est.batteryRemainingPercent}%`
                    : ''}
                </Txt>
                <Txt variant="small" style={{ color: t.color.accent }}>
                  {flown ? 'Open flight report →' : 'Open planner →'}
                </Txt>
              </Card>
            </Pressable>
          );
        })
      )}

      <View style={{ gap: 8, marginTop: 8 }}>
        <Txt variant="small">
          Educational simulator only. Not flight-control software; it does not command real
          aircraft. Demo area: Parque das Nações, Lisbon.
        </Txt>
        <Button
          compact
          variant="ghost"
          label={confirmReset ? 'Tap again to reset all demo data' : 'Reset demo data'}
          onPress={() => {
            if (confirmReset) {
              resetDemo();
              setConfirmReset(false);
            } else setConfirmReset(true);
          }}
        />
      </View>
    </Screen>
  );
}
