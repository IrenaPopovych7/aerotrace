# AeroTrace

**A mobile-first UAV mission planner and flight simulator, built with React Native (Expo) and Node.js.**

You plan a drone mission by placing waypoints on a map. AeroTrace estimates distance, duration and battery use, then flies the mission in a deterministic simulator and streams live telemetry to your phone over WebSockets. When the flight ends, you get a flight report.

> ⚠️ **Safety statement:** AeroTrace is an educational simulator and portfolio project. It is **not** flight-control software, does not send commands to real UAVs, and must not be used for operational or regulatory decisions.

---

## Project status

🚧 **Early stage: specification complete, implementation starting.**

| Area | State |
| --- | --- |
| Product & technical spec | ✅ Draft v0.2 ([`docs/SPEC.md`](docs/SPEC.md)) |
| Delivery backlog (25 issues, 6 milestones) | ✅ Draft ([`docs/BACKLOG.md`](docs/BACKLOG.md)) |
| Expo app shell | 🟡 Expo starter template |
| Node.js API, shared contracts, simulator | ⏳ Not started |

The goal is a reliable **60–90 second live demo** at Web Summit.

## What it does (planned MVP)

- **Missions:** list missions and filter them by state (draft, ready, active, completed, aborted, failed).
- **Planner:** tap the map to add waypoints, then reorder or remove them. The route and estimates update as you edit.
- **Estimates:** distance, duration, battery use and a reserve-battery warning.
- **Live mission:** an animated drone on the map, with an instrument panel (battery, altitude, speed, progress), commands (pause, resume, abort, return home) and an event timeline.
- **Failure scenarios:** demo controls trigger low battery or connection loss, so you can watch the app recover.
- **Flight reports:** summary, route, battery-over-time chart and event timeline, shareable by deep link.
- **Offline-friendly:** missions and reports you have already loaded stay readable on poor conference Wi-Fi.
- **Accessible:** screen-reader labels, light and dark themes, text scaling and reduced-motion support.

**Optional extensions:** tamper-evident report hashes with QR verification links, and anchoring selected hashes to a blockchain **test** network.

### Demo story

1. Open a seeded mission or create one.
2. Add and reorder waypoints on the map.
3. Review the distance, duration, battery and reserve estimates.
4. Start the simulated mission.
5. Watch live telemetry over WebSocket.
6. Trigger a low-battery or connection-loss event.
7. Complete the mission or return home, then open the flight report.
8. *(Optional)* Verify the report with a QR link and cryptographic hash.

## Tech stack

| Layer | Technology |
| --- | --- |
| Mobile / web client | Expo, React Native, Expo Router, React Query, TypeScript |
| API | Node.js, Fastify, TypeScript |
| Real-time | WebSockets (snapshot, ordered sequence numbers, heartbeat, reconnection) |
| Contracts | Shared runtime schemas with inferred TypeScript types |
| Quality | Strict TypeScript, linting, tests and CI on pull requests |

## Architecture

Target layout (npm workspaces):

```text
aerotrace/
├── apps/
│   ├── mobile/       # Expo, React Native, Expo Router
│   └── api/          # Node.js, TypeScript, Fastify
├── packages/
│   └── contracts/    # Runtime schemas and inferred types
├── docs/             # Spec, backlog, decisions
└── package.json      # Workspace scripts
```

- The **server is authoritative** for mission status and telemetry order.
- The **telemetry engine is deterministic**: a seed and a controllable clock make every run repeatable and testable. It is kept separate from HTTP and WebSocket delivery, so a real telemetry source could later be added behind the same boundary.
- **Commands are only accepted when valid** for the current mission state. Mission states form an explicit state machine: `draft → ready → active ⇄ paused → returning_home → completed | aborted | failed`.

### API (v1)

Base path: `/api/v1`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Service health and version |
| GET / POST | `/missions` | List missions / create a draft |
| GET / PATCH / DELETE | `/missions/:id` | Read, update or delete a draft |
| POST | `/missions/:id/estimate` | Calculate estimates |
| POST | `/missions/:id/start` | Start a simulation |
| POST | `/missions/:id/commands` | Pause, resume, abort or return home |
| GET | `/flights/:id` | Get a completed flight report |
| GET | `/flights/:id/verify` | *(Optional)* Integrity verification |

## Getting started

> These steps run the **current Expo starter**. They will change once the repository becomes a workspace (backlog issue #4).

**Prerequisites:** Node.js (LTS) and npm. To run on a device, install the [Expo Go](https://expo.dev/go) app or set up an iOS simulator or Android emulator.

```bash
git clone https://github.com/IrenaPopovych7/aerotrace.git
cd aerotrace
npm install
npm start          # Expo dev server; press i / a / w for iOS, Android or web
```

Other scripts:

```bash
npm run ios
npm run android
npm run web
```

## Roadmap

The work is planned as thin vertical slices, each crossing UI, API, validation and tests. Details and acceptance criteria are in [`docs/BACKLOG.md`](docs/BACKLOG.md).

- [ ] **M0 — Product definition:** spec, mission and simulation rules, screen flows
- [ ] **M1 — Engineering foundation:** npm workspace, lint, tests and CI, Fastify API shell, Expo Router, design tokens
- [ ] **M2 — Mission planning:** shared schemas and state machine, mission CRUD API, mission list, waypoint planner, estimates
- [ ] **M3 — Live simulation:** deterministic simulator, WebSocket streaming, live map and instruments, failure-scenario demo mode
- [ ] **M4 — Flight reports:** persisted reports, report screen, *(optional)* hash and QR verification, *(optional)* test-network anchoring
- [ ] **M5 — Demo readiness:** offline resilience, accessibility and performance pass, deployment, Web Summit rehearsal

**First release:** issues 1–19 and 22–25. The Web3 issues (20–21) are optional and can be removed without breaking the core product.

## Out of scope

- Real drone command or autopilot integration
- Regulatory flight authorization or certified safety decisions
- Accounts, teams, permissions or subscriptions
- Live airspace, weather or no-fly-zone data
- Production blockchain or financial transactions

## Documentation

- [Product & technical specification](docs/SPEC.md)
- [Implementation backlog](docs/BACKLOG.md)
