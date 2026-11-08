import { canTransition, isTerminal, RULES } from '@aerotrace/contracts';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { MissionMap } from '../map/MissionMap';
import type { Route } from '../navigation';
import { useStore } from '../state/store';
import type { FlightReport } from '../state/types';
import { useLocalSimulation } from '../state/useLocalSimulation';
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
import { Timeline } from '../ui/Timeline';
import { useTheme } from '../ui/theme';

const SPEEDS = [1, 10, 20];

export function LiveScreen({ id, navigate }: { id: string; navigate: (r: Route) => void }) {
  const t = useTheme();
  const { missions, saveFlight } = useStore();
  const mission = missions.find((m) => m.id === id);
  const [timeScale, setTimeScale] = useState<number>(RULES.simulator.demoTimeScale);
  const [report, setReport] = useState<FlightReport | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const { snapshot, start, command, inject } = useLocalSimulation(mission, timeScale, (r) => {
    saveFlight(r);
    setReport(r);
  });

  const canFly = mission && (mission.status === 'active' || mission.status === 'ready');
  useEffect(() => {
    if (canFly && !snapshot) start();
    // Start once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFly]);

  if (!mission || (!snapshot && !canFly)) {
    return (
      <Screen>
        <Txt variant="title">No live flight</Txt>
        <Txt variant="muted">This mission is not flying. Open it from the missions list.</Txt>
        <Button label="Back to missions" onPress={() => navigate({ name: 'missions' })} />
      </Screen>
    );
  }
  if (!snapshot)
    return (
      <Screen>
        <Txt variant="muted">Starting simulator…</Txt>
      </Screen>
    );

  const { status, telemetry: tel } = snapshot;
  const done = isTerminal(status);
  const busy = snapshot.aborting || done;
  const batteryTone =
    tel.batteryPercent < RULES.battery.criticalEventPercent
      ? 'critical'
      : tel.batteryPercent < RULES.battery.lowEventPercent
        ? 'warning'
        : undefined;
  const cause = snapshot.returnHomeCause;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button
          compact
          variant="ghost"
          label="← Missions"
          onPress={() => navigate({ name: 'missions' })}
        />
        <Row>
          {snapshot.linkLost && (
            <View
              accessibilityRole="alert"
              style={{
                backgroundColor: t.color.criticalBg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Txt variant="small" style={{ color: t.color.critical, fontWeight: '700' }}>
                ⚠ LINK LOST
              </Txt>
            </View>
          )}
          <StatusBadge status={status} />
        </Row>
      </Row>
      <Txt variant="title" role="header">
        {mission.name}
      </Txt>

      {status === 'returning_home' && cause && cause !== 'route_finished' && !snapshot.aborting && (
        <Notice tone={cause === 'operator' ? 'info' : 'critical'}>
          {cause === 'battery'
            ? 'Critical battery: the drone is returning home automatically.'
            : cause === 'link'
              ? 'Link lost for more than 10 s: failsafe return home.'
              : 'Returning home on operator command.'}
        </Notice>
      )}
      {snapshot.aborting && !done && <Notice tone="warning">Abort: landing in place.</Notice>}

      <MissionMap
        height={300}
        label={`Live map. Drone at ${tel.altitudeMeters} metres, ${tel.progressPercent}% of the mission done.`}
        waypoints={mission.waypoints}
        drone={tel}
        flownPath={snapshot.flownPath}
      />

      <Row>
        <Stat
          label="Battery"
          value={`${tel.batteryPercent.toFixed(1)}`}
          unit="%"
          tone={batteryTone}
        />
        <Stat label="Altitude" value={`${tel.altitudeMeters.toFixed(0)}`} unit="m" />
        <Stat label="Speed" value={`${tel.speedMetersPerSecond.toFixed(1)}`} unit="m/s" />
        <Stat label="Progress" value={`${tel.progressPercent.toFixed(0)}`} unit="%" />
        <Stat label="Elapsed" value={formatDuration(snapshot.elapsedSeconds)} />
        <Stat
          label="Waypoints"
          value={`${snapshot.waypointsReached}/${snapshot.waypointCount - 1}`}
        />
      </Row>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(tel.batteryPercent) }}
        accessibilityLabel="Battery level"
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: t.color.surfaceAlt,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${tel.batteryPercent}%`,
            height: '100%',
            backgroundColor:
              batteryTone === 'critical'
                ? t.color.critical
                : batteryTone === 'warning'
                  ? t.color.warning
                  : t.color.good,
          }}
        />
      </View>

      {done && report ? (
        <Card>
          <Txt variant="heading">Flight {status}</Txt>
          <Txt variant="muted">
            {formatDistance(report.distanceMeters)} flown in{' '}
            {formatDuration(report.durationSeconds)} · landed at {report.batteryEndPercent}%
          </Txt>
          <Button
            variant="primary"
            label="Open flight report"
            onPress={() => navigate({ name: 'report', id: report.id })}
          />
        </Card>
      ) : (
        <Card>
          <Txt variant="heading">Commands</Txt>
          <Row>
            {status === 'paused' ? (
              <Button
                label="▶ Resume"
                variant="primary"
                disabled={busy || !canTransition(status, 'resume')}
                onPress={() => command('resume')}
              />
            ) : (
              <Button
                label="❚❚ Pause"
                disabled={busy || !canTransition(status, 'pause')}
                onPress={() => command('pause')}
              />
            )}
            <Button
              label="⌂ Return home"
              disabled={busy || !canTransition(status, 'return_home')}
              onPress={() => command('return_home')}
            />
            <Button
              label={confirmAbort ? 'Tap again to abort' : '■ Abort'}
              variant="danger"
              disabled={busy}
              onPress={() => {
                if (confirmAbort) {
                  command('abort');
                  setConfirmAbort(false);
                } else setConfirmAbort(true);
              }}
            />
          </Row>
          <Row style={{ marginTop: 4 }}>
            <Txt variant="small">Simulation speed</Txt>
            {SPEEDS.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: s === timeScale }}
                onPress={() => setTimeScale(s)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: s === timeScale ? t.color.accent : t.color.border,
                  backgroundColor: s === timeScale ? t.color.accent : 'transparent',
                }}
              >
                <Txt
                  variant="small"
                  style={{
                    color: s === timeScale ? t.color.accentText : t.color.text,
                    fontWeight: '600',
                  }}
                >
                  {s}×
                </Txt>
              </Pressable>
            ))}
          </Row>
        </Card>
      )}

      {!done && (
        <Card style={{ borderStyle: 'dashed' }}>
          <Txt variant="heading">Demo: inject a failure</Txt>
          <Txt variant="small">
            Fault injection for the demo. Disabled by configuration in production builds.
          </Txt>
          <Row>
            <Button
              compact
              label="🔋 Low battery (19%)"
              disabled={busy}
              onPress={() => inject({ type: 'low_battery' })}
            />
            <Button
              compact
              label="📡 Link loss 5 s"
              disabled={busy || snapshot.linkLost}
              onPress={() => inject({ type: 'link_loss', durationSeconds: 5 })}
            />
            <Button
              compact
              label="📡 Link loss 15 s"
              disabled={busy || snapshot.linkLost}
              onPress={() => inject({ type: 'link_loss', durationSeconds: 15 })}
            />
          </Row>
        </Card>
      )}

      <Card>
        <Txt variant="heading">Event timeline</Txt>
        <Timeline events={snapshot.events} newestFirst />
      </Card>
    </Screen>
  );
}
