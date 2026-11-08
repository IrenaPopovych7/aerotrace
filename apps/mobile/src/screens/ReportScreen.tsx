import { useState } from 'react';
import { MissionMap } from '../map/MissionMap';
import type { Route } from '../navigation';
import { useStore } from '../state/store';
import { BatteryChart } from '../ui/BatteryChart';
import {
  Button,
  Card,
  formatDistance,
  formatDuration,
  Row,
  Screen,
  Stat,
  StatusBadge,
  Txt,
} from '../ui/primitives';
import { Timeline } from '../ui/Timeline';

const CAUSE: Record<string, string> = {
  operator: 'Operator ordered return home',
  battery: 'Automatic return home: critical battery',
  link: 'Automatic return home: link failsafe',
  route_finished: 'All waypoints flown',
};

export function ReportScreen({ id, navigate }: { id: string; navigate: (r: Route) => void }) {
  const { flights, duplicateMission } = useStore();
  const report = flights.find((f) => f.id === id);
  const [copied, setCopied] = useState(false);

  if (!report) {
    return (
      <Screen>
        <Txt variant="title">Report not found</Txt>
        <Txt variant="muted">Flight reports are stored on the device that flew them.</Txt>
        <Button label="Back to missions" onPress={() => navigate({ name: 'missions' })} />
      </Screen>
    );
  }

  const started = new Date(report.startedAt);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button
          compact
          variant="ghost"
          label="← Missions"
          onPress={() => navigate({ name: 'missions' })}
        />
        <StatusBadge status={report.status} />
      </Row>
      <Txt variant="title" role="header">
        Flight report · {report.missionName}
      </Txt>
      <Txt variant="muted">
        {started.toLocaleDateString()}{' '}
        {started.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
        {report.returnHomeCause ? CAUSE[report.returnHomeCause] : 'Ended by abort'}
      </Txt>

      <Row>
        <Stat label="Duration" value={formatDuration(report.durationSeconds)} />
        <Stat label="Distance flown" value={formatDistance(report.distanceMeters)} />
        <Stat
          label="Battery"
          value={`${report.batteryStartPercent} → ${report.batteryEndPercent}`}
          unit="%"
        />
        <Stat label="Waypoints" value={`${report.waypointsReached}/${report.waypointCount - 1}`} />
      </Row>

      <MissionMap
        height={280}
        label={`Planned route dashed, flown path solid. ${report.waypointsReached} of ${report.waypointCount - 1} waypoints reached.`}
        waypoints={report.waypoints}
        flownPath={report.flownPath}
      />

      <Card>
        <Txt variant="heading">Battery over time</Txt>
        <BatteryChart samples={report.samples} />
      </Card>

      <Card>
        <Txt variant="heading">Event timeline</Txt>
        <Timeline events={report.events} />
      </Card>

      <Row>
        <Button
          label={copied ? 'Link copied' : 'Copy report link'}
          onPress={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        />
        <Button
          variant="primary"
          label="Fly this route again"
          onPress={() => {
            const copy = duplicateMission(report.missionId);
            if (copy) navigate({ name: 'plan', id: copy.id });
          }}
        />
      </Row>
    </Screen>
  );
}
