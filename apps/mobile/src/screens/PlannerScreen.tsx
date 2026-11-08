import {
  estimateMission,
  isEditable,
  RULES,
  type LatLon,
  type Waypoint,
} from '@aerotrace/contracts';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { MissionMap } from '../map/MissionMap';
import type { Route } from '../navigation';
import { newId, useStore } from '../state/store';
import {
  Button,
  Card,
  formatDistance,
  formatDuration,
  Notice,
  Row,
  Screen,
  Stat,
  StatusBadge,
  Txt,
} from '../ui/primitives';
import { useTheme } from '../ui/theme';

const ALT_STEP = 10;

export function PlannerScreen({ id, navigate }: { id: string; navigate: (r: Route) => void }) {
  const t = useTheme();
  const { missions, renameMission, setWaypoints, startMission, deleteMission } = useStore();
  const mission = missions.find((m) => m.id === id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const waypoints = useMemo(
    () => [...(mission?.waypoints ?? [])].sort((a, b) => a.order - b.order),
    [mission],
  );
  const estimate = useMemo(() => estimateMission(waypoints), [waypoints]);

  if (!mission) {
    return (
      <Screen>
        <Txt variant="title">Mission not found</Txt>
        <Txt variant="muted">This link points to a mission that does not exist on this device.</Txt>
        <Button label="Back to missions" onPress={() => navigate({ name: 'missions' })} />
      </Screen>
    );
  }

  const editable = isEditable(mission.status);
  const update = (next: Waypoint[]) => setWaypoints(mission.id, next);

  const add = (p: LatLon) => {
    if (!editable || waypoints.length >= RULES.route.maxWaypoints) return;
    const prevAlt = waypoints.at(-1)?.altitudeMeters ?? 30;
    const wp: Waypoint = {
      id: newId('wp'),
      latitude: p.latitude,
      longitude: p.longitude,
      altitudeMeters: prevAlt,
      order: waypoints.length,
    };
    update([...waypoints, wp]);
    setSelectedId(wp.id);
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= waypoints.length) return;
    const next = [...waypoints];
    [next[index], next[target]] = [next[target]!, next[index]!];
    update(next);
  };
  const remove = (index: number) => update(waypoints.filter((_, i) => i !== index));
  const setAlt = (index: number, delta: number) =>
    update(
      waypoints.map((w, i) =>
        i === index
          ? {
              ...w,
              altitudeMeters: Math.min(
                RULES.route.maxAltitudeMeters,
                Math.max(RULES.route.minAltitudeMeters, w.altitudeMeters + delta),
              ),
            }
          : w,
      ),
    );

  const errors = estimate.issues.filter((i) => i.severity === 'error');
  const warnings = estimate.issues.filter((i) => i.severity === 'warning');
  const landing = estimate.batteryRemainingPercent;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button
          compact
          variant="ghost"
          label="← Missions"
          onPress={() => navigate({ name: 'missions' })}
        />
        <StatusBadge status={mission.status} />
      </Row>

      <TextInput
        accessibilityLabel="Mission name"
        value={mission.name}
        editable={editable}
        onChangeText={(v) => renameMission(mission.id, v)}
        maxLength={80}
        style={{
          fontSize: t.font.xl,
          fontWeight: '700',
          color: t.color.text,
          borderBottomWidth: editable ? 1 : 0,
          borderColor: t.color.border,
          paddingVertical: 4,
        }}
      />

      <MissionMap
        height={340}
        label={`Planner map with ${waypoints.length} waypoints. ${editable ? 'Tap the map to add a waypoint.' : ''}`}
        waypoints={waypoints}
        selectedId={selectedId}
        onAddWaypoint={editable ? add : undefined}
        onSelectWaypoint={setSelectedId}
      />
      <Txt variant="small">
        {editable
          ? waypoints.length === 0
            ? 'Tap the map to place home (H), then tap again to add waypoints.'
            : 'Tap the map to add a waypoint. The drone flies them in order and returns home.'
          : 'This mission has flown and is read-only.'}
      </Txt>

      <Card>
        <Txt variant="heading">Estimate</Txt>
        <Row>
          <Stat label="Distance" value={formatDistance(estimate.distanceMeters)} />
          <Stat label="Duration" value={formatDuration(estimate.durationSeconds)} />
          <Stat
            label="Battery at landing"
            value={waypoints.length > 1 ? `${landing}` : '—'}
            unit={waypoints.length > 1 ? '%' : undefined}
            tone={
              landing < RULES.battery.insufficientPercent
                ? 'critical'
                : landing < RULES.battery.reserveWarningPercent
                  ? 'warning'
                  : undefined
            }
          />
        </Row>
        <Txt variant="small">
          Model: {RULES.flight.cruiseSpeedMetersPerSecond} m/s cruise,{' '}
          {RULES.flight.climbRateMetersPerSecond} m/s climb, {RULES.battery.reserveWarningPercent}%
          reserve. Same function as the simulator.
        </Txt>
        {errors.map((i) => (
          <Notice key={i.code + (i.field ?? '')} tone="critical">
            {i.message}
          </Notice>
        ))}
        {warnings.map((i) => (
          <Notice key={i.code} tone="warning">
            {i.message}
          </Notice>
        ))}
      </Card>

      {waypoints.length > 0 && (
        <Card>
          <Txt variant="heading">Waypoints</Txt>
          {waypoints.map((wp, i) => {
            const selected = wp.id === selectedId;
            return (
              <View
                key={wp.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  padding: 8,
                  borderRadius: t.radius.md,
                  backgroundColor: selected ? t.color.surfaceAlt : 'transparent',
                  flexWrap: 'wrap',
                }}
              >
                <Txt variant="body" style={{ fontWeight: '700', width: 84 }}>
                  {i === 0 ? 'H · Home' : `#${i + 1}`}
                </Txt>
                <Txt
                  variant="body"
                  style={{ flex: 1, minWidth: 60, fontVariant: ['tabular-nums'] }}
                >
                  {wp.altitudeMeters} m
                </Txt>
                {editable && (
                  <>
                    <Button
                      compact
                      label="−"
                      accessibilityHint={`Lower waypoint ${i + 1} by ${ALT_STEP} metres`}
                      onPress={() => setAlt(i, -ALT_STEP)}
                    />
                    <Button
                      compact
                      label="+"
                      accessibilityHint={`Raise waypoint ${i + 1} by ${ALT_STEP} metres`}
                      onPress={() => setAlt(i, ALT_STEP)}
                    />
                    <Button
                      compact
                      label="↑"
                      accessibilityHint="Move earlier"
                      disabled={i === 0}
                      onPress={() => move(i, -1)}
                    />
                    <Button
                      compact
                      label="↓"
                      accessibilityHint="Move later"
                      disabled={i === waypoints.length - 1}
                      onPress={() => move(i, 1)}
                    />
                    <Button
                      compact
                      variant="danger"
                      label="✕"
                      accessibilityHint={`Remove waypoint ${i + 1}`}
                      onPress={() => remove(i)}
                    />
                  </>
                )}
              </View>
            );
          })}
        </Card>
      )}

      {editable && (
        <View style={{ gap: 8 }}>
          <Button
            variant="primary"
            label="Start simulated flight"
            disabled={!estimate.canBeReady}
            accessibilityHint={estimate.canBeReady ? undefined : 'Fix the errors above first'}
            onPress={() => {
              if (startMission(mission.id)) navigate({ name: 'live', id: mission.id });
            }}
          />
          {mission.status === 'draft' && (
            <Button
              compact
              variant="ghost"
              label="Delete draft"
              onPress={() => {
                deleteMission(mission.id);
                navigate({ name: 'missions' });
              }}
            />
          )}
        </View>
      )}
    </Screen>
  );
}
