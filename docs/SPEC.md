# AeroTrace — Product and Technical Specification

Status: Draft v0.2  
Purpose: React Native and Node.js portfolio project  
Target: A reliable 60–90 second Web Summit demonstration

## Product vision

AeroTrace is a mobile-first UAV mission planner and flight simulator. An operator creates waypoint-based missions, previews route and battery estimates, observes deterministic live telemetry, and reviews completed flight reports.

It demonstrates production-shaped React Native and Node.js skills without claiming to control a real aircraft. A real telemetry source could later be added behind the same backend boundary.

## Primary user and problem

The primary user is a UAV operator who needs to plan and review a simple mission from a phone. AeroTrace focuses on explaining the mission lifecycle clearly and handling unreliable connectivity deliberately.

For the portfolio audience, its technical depth must be understandable quickly through an interactive map, live simulation, visible failure recovery, and a polished report.

## Demo story

1. Open a seeded mission or create one.
2. Add and reorder waypoints on the map.
3. Review distance, duration, battery, and reserve estimates.
4. Start the simulated mission.
5. Watch telemetry update through a WebSocket connection.
6. Trigger a controlled low-battery or connection-loss event.
7. Complete or return home and open the flight report.
8. Optionally verify the report through a QR link and cryptographic hash.

The happy-path demonstration should take no longer than 90 seconds.

## MVP scope

### Included

- Mission list with draft, ready, active, completed, aborted, and failed states.
- Mission creation and waypoint editing on a map.
- Route distance, duration, and battery estimates.
- Node.js API with runtime validation and seeded persistence.
- Deterministic telemetry simulator.
- WebSocket telemetry streaming and reconnection UX.
- Live map, instruments, commands, and event timeline.
- Flight report with route and battery visualization.
- Cached read access and explicit poor-network behavior.
- iOS and Android support; web where platform capabilities permit it.
- Accessible controls, light/dark themes, and reduced-motion behavior.

### Optional extension

- Tamper-evident report hashes and QR verification links.
- Anchoring selected hashes to a blockchain test network.

### Explicitly deferred

- Real drone command or autopilot integration.
- Regulatory flight authorization or certified safety decisions.
- Accounts, teams, permissions, or subscriptions.
- Live airspace, weather, or no-fly-zone integrations.
- Production blockchain or financial transactions.

## Screens

- Missions: filter by state, open a mission, or create a draft.
- Planner: edit waypoints and review estimates and warnings.
- Live mission: map, telemetry, connection state, commands, and events.
- Flight report: summary, route, battery chart, timeline, and sharing.
- Settings/About: units, demo explanation, technology, and safety statement.

Deep links address missions and reports by identifier. Invalid identifiers show a friendly not-found state.

## Core domain model

```ts
type MissionStatus =
  'draft' | 'ready' | 'active' | 'paused' | 'returning_home' | 'completed' | 'aborted' | 'failed';

type Waypoint = {
  id: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  order: number;
};

type Mission = {
  id: string;
  name: string;
  status: MissionStatus;
  waypoints: Waypoint[];
  createdAt: string;
  updatedAt: string;
};

type Telemetry = {
  missionId: string;
  sequence: number;
  recordedAt: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  speedMetersPerSecond: number;
  batteryPercent: number;
  progressPercent: number;
};
```

Timestamps use ISO 8601 UTC strings. Values carry units in their names. Shared schemas validate data at runtime and provide inferred TypeScript types.

## Initial API contract

Base path: `/api/v1`

| Method | Path                     | Purpose                              |
| ------ | ------------------------ | ------------------------------------ |
| GET    | `/health`                | Service health and version           |
| GET    | `/missions`              | List missions                        |
| POST   | `/missions`              | Create a draft mission               |
| GET    | `/missions/:id`          | Get one mission                      |
| PATCH  | `/missions/:id`          | Update permitted draft fields        |
| DELETE | `/missions/:id`          | Delete a draft mission               |
| POST   | `/missions/:id/estimate` | Calculate estimates                  |
| POST   | `/missions/:id/start`    | Start a simulation                   |
| POST   | `/missions/:id/commands` | Pause, resume, abort, or return home |
| GET    | `/flights/:id`           | Get a completed report               |
| GET    | `/flights/:id/verify`    | Optional integrity verification      |

WebSocket subscriptions stream telemetry and mission events for one mission. The protocol will define an initial snapshot, ordered sequence numbers, heartbeat, errors, reconnection, and terminal messages.

Errors use one shape:

```ts
type ApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
};
```

## Architecture

```text
aerotrace/
├── apps/
│   ├── mobile/       # Expo, React Native, Expo Router
│   └── api/          # Node.js, TypeScript, Fastify
├── packages/
│   └── contracts/    # Runtime schemas and inferred types
├── docs/
└── package.json      # npm workspace scripts
```

The client uses React Query for API server state and local component state for transient planner interactions. The backend isolates the deterministic telemetry engine from HTTP and WebSocket delivery. Seeded persistence comes first; a lightweight relational database is introduced when persistence becomes a learning objective.

## Simulation constraints

- A mission requires a minimum number of valid waypoints before becoming ready.
- A fixed, documented model estimates time and battery use.
- A seed and controllable clock make runs repeatable.
- Events include low battery, connection loss, pause, resume, return home, completion, abort, and failure.
- Commands are accepted only when valid for the current state.
- The server is authoritative for status and telemetry order.
- Exact thresholds are approved in the mission-rules task before implementation.

## Reliability, security, and quality

- No private blockchain or service key is stored in the mobile app.
- The server validates payloads and rejects unexpected fields.
- WebSocket and simulator resources are cleaned up after disconnect or completion.
- Previously loaded missions and reports remain readable offline.
- Demo controls are isolated behind configuration.
- Critical feedback does not rely on color alone.
- Text scaling and reduced-motion preferences are supported.
- Telemetry updates avoid unnecessary whole-screen rendering.
- Lint, strict type-check, tests, and build checks run in CI.

## Success criteria

- A first-time viewer understands the mission lifecycle within 90 seconds.
- Planning to simulation requires no undocumented setup.
- Low-battery and connection-loss scenarios are repeatable.
- Reconnection does not duplicate telemetry or listeners.
- The demo survives a rehearsed poor-network scenario.
- The repository explains important decisions and learning outcomes.

## Safety statement

AeroTrace is an educational simulator and portfolio project. It is not flight-control software, does not issue commands to real UAVs, and must not be used for operational or regulatory decisions.

## Open decisions

- Mission and battery thresholds.
- Default demo map location.
- Map provider and supported web behavior.
- Persistence database and hosting provider.
- Whether report verification is included before Web Summit.
- Whether blockchain anchoring adds enough value for its complexity.

Implementation tasks and acceptance criteria are tracked in `docs/BACKLOG.md`.
