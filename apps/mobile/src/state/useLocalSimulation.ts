import {
  createSimulator,
  isTerminal,
  type DemoInjection,
  type Mission,
  type MissionCommand,
  type Simulator,
  type SimulatorSnapshot,
} from '@aerotrace/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { newId } from './store';
import type { FlightReport } from './types';

/** Seed from the mission id, so the same mission always flies the same way. */
function seedFrom(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

const UI_FRAME_MS = 66; // ~15 updates per second: smooth, without re-rendering every frame

/**
 * Runs the shared deterministic simulator in the client (Summit demo mode). In the full build
 * the same simulator runs on the server and this hook is replaced by a WebSocket stream (#15).
 */
export function useLocalSimulation(
  mission: Mission | undefined,
  timeScale: number,
  onFinished: (report: FlightReport) => void,
) {
  const sim = useRef<Simulator | null>(null);
  const startedAt = useRef<string>('');
  const [snapshot, setSnapshot] = useState<SimulatorSnapshot | null>(null);
  const [runId, setRunId] = useState(0);
  const missionRef = useRef(mission);
  missionRef.current = mission;
  const scale = useRef(timeScale);
  scale.current = timeScale;
  const finished = useRef(onFinished);
  finished.current = onFinished;

  const start = useCallback(() => {
    if (!mission) return;
    startedAt.current = new Date().toISOString();
    sim.current = createSimulator({
      mission,
      seed: seedFrom(mission.id),
      startedAt: startedAt.current,
    });
    setSnapshot(sim.current.snapshot());
    setRunId((id) => id + 1);
  }, [mission]);

  useEffect(() => {
    if (runId === 0 || !sim.current) return;
    let frame = 0;
    let last = performance.now();
    let lastUi = last;
    let stopped = false;
    const loop = (now: number) => {
      if (stopped || !sim.current) return;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const snap = sim.current.advance(dt * scale.current);
      if (now - lastUi >= UI_FRAME_MS || isTerminal(snap.status)) {
        lastUi = now;
        setSnapshot(snap);
      }
      if (isTerminal(snap.status)) {
        stopped = true;
        if (missionRef.current)
          finished.current(toReport(missionRef.current, snap, startedAt.current));
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [runId]);

  const command = useCallback((c: MissionCommand) => {
    const ok = sim.current?.command(c) ?? false;
    if (sim.current) setSnapshot(sim.current.snapshot());
    return ok;
  }, []);

  const inject = useCallback((i: DemoInjection) => {
    const ok = sim.current?.inject(i) ?? false;
    if (sim.current) setSnapshot(sim.current.snapshot());
    return ok;
  }, []);

  return { snapshot, start, command, inject };
}

function toReport(mission: Mission, snap: SimulatorSnapshot, startedAt: string): FlightReport {
  const first = snap.history[0];
  return {
    id: newId('f'),
    missionId: mission.id,
    missionName: mission.name,
    status: snap.status as FlightReport['status'],
    startedAt,
    endedAt: new Date(Date.parse(startedAt) + snap.elapsedSeconds * 1000).toISOString(),
    durationSeconds: snap.elapsedSeconds,
    distanceMeters: snap.distanceFlownMeters,
    batteryStartPercent: first?.batteryPercent ?? 100,
    batteryEndPercent: snap.telemetry.batteryPercent,
    waypointsReached: snap.waypointsReached,
    waypointCount: snap.waypointCount,
    returnHomeCause: snap.returnHomeCause,
    waypoints: mission.waypoints,
    flownPath: snap.flownPath.map(({ latitude, longitude }) => ({ latitude, longitude })),
    samples: snap.history.map((t) => ({
      elapsedSeconds:
        (Date.parse(t.recordedAt) - Date.parse(first?.recordedAt ?? t.recordedAt)) / 1000,
      batteryPercent: t.batteryPercent,
      altitudeMeters: t.altitudeMeters,
    })),
    events: [...snap.events],
  };
}
