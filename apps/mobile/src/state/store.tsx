import { nextStatus, type Mission, type MissionStatus, type Waypoint } from '@aerotrace/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { seedMissions } from './seed';
import type { FlightReport } from './types';

const STORAGE_KEY = 'aerotrace:v1';

type Persisted = { missions: Mission[]; flights: FlightReport[] };

function load(): Persisted {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted;
      if (Array.isArray(parsed.missions) && Array.isArray(parsed.flights)) return parsed;
    }
  } catch {
    // Storage can be missing or blocked; the demo still works in memory.
  }
  return { missions: seedMissions(), flights: [] };
}

function save(data: Persisted) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

const now = () => new Date().toISOString();
const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

type Store = {
  missions: Mission[];
  flights: FlightReport[];
  createMission: () => Mission;
  renameMission: (id: string, name: string) => void;
  setWaypoints: (id: string, waypoints: Waypoint[]) => void;
  setStatus: (id: string, status: MissionStatus) => void;
  startMission: (id: string) => boolean;
  saveFlight: (report: FlightReport) => void;
  duplicateMission: (id: string) => Mission | null;
  deleteMission: (id: string) => void;
  resetDemo: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Persisted>(load);
  useEffect(() => save(data), [data]);

  const updateMission = useCallback((id: string, change: (m: Mission) => Mission) => {
    setData((d) => ({
      ...d,
      missions: d.missions.map((m) => (m.id === id ? { ...change(m), updatedAt: now() } : m)),
    }));
  }, []);

  const editable = (m: Mission) => m.status === 'draft' || m.status === 'ready';

  const store = useMemo<Store>(
    () => ({
      missions: data.missions,
      flights: data.flights,
      createMission: () => {
        const mission: Mission = {
          id: newId('m'),
          name: `Mission ${data.missions.length + 1}`,
          status: 'draft',
          waypoints: [],
          createdAt: now(),
          updatedAt: now(),
        };
        setData((d) => ({ ...d, missions: [mission, ...d.missions] }));
        return mission;
      },
      renameMission: (id, name) => updateMission(id, (m) => (editable(m) ? { ...m, name } : m)),
      setWaypoints: (id, waypoints) =>
        updateMission(id, (m) =>
          editable(m)
            ? {
                ...m,
                // Any edit to a ready mission sends it back to draft (RULES.md §5).
                status: m.status === 'ready' ? (nextStatus('ready', 'edit') ?? 'draft') : m.status,
                waypoints: waypoints.map((w, order) => ({ ...w, order })),
              }
            : m,
        ),
      setStatus: (id, status) => updateMission(id, (m) => ({ ...m, status })),
      startMission: (id) => {
        const mission = data.missions.find((m) => m.id === id);
        if (!mission) return false;
        let status: MissionStatus | null = mission.status;
        if (status === 'draft') status = nextStatus(status, 'mark_ready');
        status = status ? nextStatus(status, 'start') : null;
        if (!status) return false;
        updateMission(id, (m) => ({ ...m, status: status! }));
        return true;
      },
      saveFlight: (report) =>
        setData((d) => ({
          missions: d.missions.map((m) =>
            m.id === report.missionId ? { ...m, status: report.status, updatedAt: now() } : m,
          ),
          flights: [report, ...d.flights.filter((f) => f.id !== report.id)],
        })),
      duplicateMission: (id) => {
        const source = data.missions.find((m) => m.id === id);
        if (!source) return null;
        const copy: Mission = {
          ...source,
          id: newId('m'),
          name: `${source.name} (again)`,
          status: 'draft',
          waypoints: source.waypoints.map((w) => ({ ...w, id: newId('wp') })),
          createdAt: now(),
          updatedAt: now(),
        };
        setData((d) => ({ ...d, missions: [copy, ...d.missions] }));
        return copy;
      },
      deleteMission: (id) =>
        setData((d) => ({ ...d, missions: d.missions.filter((m) => m.id !== id || !editable(m)) })),
      resetDemo: () => setData({ missions: seedMissions(), flights: [] }),
    }),
    [data, updateMission],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

export { newId };
