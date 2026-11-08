# AeroTrace — Mission and Simulation Rules

Status: v1.0 (closes backlog issue #2)  
Applies to: `packages/contracts` (estimates, state machine), `apps/api` (simulator), `apps/mobile` (planner warnings)

> AeroTrace is an educational simulator. It is **not** certified flight-control software, does not command real
> aircraft, and these rules are **not** operational or regulatory guidance. The numbers below are chosen to make a
> clear, repeatable demo, not to model a specific drone.

All constants in this document live in one place in code: `packages/contracts/src/rules.ts`. If a number changes,
change it there and here in the same pull request.

## 1. Units

| Quantity   | Unit                          | Field suffix            | Notes                                                                    |
| ---------- | ----------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| Position   | WGS 84 decimal degrees        | `latitude`, `longitude` | latitude −90…90, longitude −180…180                                      |
| Altitude   | metres above take-off point   | `altitudeMeters`        | not above sea level                                                      |
| Distance   | metres                        | `…Meters`               | horizontal distance uses the haversine formula, Earth radius 6 371 000 m |
| Speed      | metres per second             | `…MetersPerSecond`      |                                                                          |
| Duration   | seconds                       | `…Seconds`              |                                                                          |
| Battery    | percent of full charge, 0–100 | `…Percent`              |                                                                          |
| Timestamps | ISO 8601 UTC strings          | `…At`                   | e.g. `2026-11-10T14:03:22.120Z`                                          |

**Rounding (client and server must agree):** estimates are calculated at full precision and rounded only for
output. Distance → nearest metre. Duration → nearest second. Battery → one decimal place. Rounding uses
half-away-from-zero.

## 2. Route and waypoint limits

- **Home** is the first waypoint (`order = 0`). The drone takes off from home and always lands at home.
- A mission needs **at least 2 waypoints** (home + one destination) to become `ready`.
- A mission may have **at most 25 waypoints**.
- Waypoint altitude: **10–120 m**. (120 m mirrors the common open-category ceiling; it is a sanity limit here.)
- Home's altitude is the take-off altitude used for the first climb; the drone itself starts on the ground (0 m).
- Any single leg may be at most **2 000 m** long.
- The full route, including the return leg to home, may be at most **10 000 m**.
- Two consecutive waypoints closer than **5 m** horizontally and vertically are rejected as duplicates.
- `order` values are contiguous integers starting at 0. The server re-numbers after any insert, move, or delete.

Validation errors are returned per field (`fieldErrors`) so the planner can say exactly what to fix.

## 3. Flight model

The drone flies in straight lines between waypoints, in order, then returns to home and lands.

| Parameter                         | Value  |
| --------------------------------- | ------ |
| Cruise (horizontal) speed         | 10 m/s |
| Climb rate                        | 3 m/s  |
| Descent rate                      | 2 m/s  |
| Hover at each waypoint (not home) | 3 s    |

Altitude changes happen **before** the horizontal leg when climbing and **after** it when descending — simple to
explain, simple to test. The final landing is a vertical descent at home.

### Battery model

Battery drains at a fixed rate per second, depending on the flight phase:

| Phase      | Drain    |
| ---------- | -------- |
| Climbing   | 0.15 %/s |
| Cruising   | 0.07 %/s |
| Hovering   | 0.08 %/s |
| Descending | 0.04 %/s |

Every flight starts at **100 %**. With these rates a flight of about 20 minutes uses most of a battery, which is in
the range of a small consumer quadcopter.

## 4. Estimates

`POST /missions/:id/estimate` and the planner run **the same function** from `packages/contracts`, so they cannot
disagree. The estimate covers take-off → every waypoint in order → return to home → landing, and returns:

- `distanceMeters` (horizontal + vertical path length)
- `durationSeconds`
- `batteryUsedPercent` and `batteryRemainingPercent`
- `warnings[]` and whether the mission `canBeReady`

| Check            | Rule                                 | Effect                                                        |
| ---------------- | ------------------------------------ | ------------------------------------------------------------- |
| Reserve warning  | estimated landing battery **< 25 %** | warning `battery_reserve_low`; mission can still become ready |
| Battery blocking | estimated landing battery **< 10 %** | error `battery_insufficient`; mission cannot become ready     |
| Route limits     | any limit in §2 broken               | error with the field that broke it                            |

## 5. Mission states

```text
draft ──► ready ──► active ⇄ paused
  ▲         │         │        │
  └─────────┘         ▼        ▼
   (edit)        returning_home ──► completed | aborted
                      │
        active / paused / returning_home ──► aborted | failed
```

| From                                 | Trigger                                             | To               | Notes                                                           |
| ------------------------------------ | --------------------------------------------------- | ---------------- | --------------------------------------------------------------- |
| `draft`                              | estimate passes (`canBeReady`) and user marks ready | `ready`          |                                                                 |
| `ready`                              | any edit to waypoints or name                       | `draft`          | estimates must be re-run                                        |
| `ready`                              | `start`                                             | `active`         | server creates a flight and starts the simulator                |
| `active`                             | `pause`                                             | `paused`         | drone hovers in place; battery keeps draining at the hover rate |
| `paused`                             | `resume`                                            | `active`         | continues toward the same target waypoint                       |
| `active`, `paused`                   | `return_home` (operator)                            | `returning_home` |                                                                 |
| `active`, `paused`                   | critical battery or link loss failsafe              | `returning_home` | automatic; see §6                                               |
| `active`                             | last waypoint reached                               | `returning_home` | the normal final leg                                            |
| `returning_home`                     | landed at home, **all waypoints reached**           | `completed`      |                                                                 |
| `returning_home`                     | landed at home, waypoints remaining                 | `aborted`        | outcome reason recorded (operator, battery, link)               |
| `active`, `paused`, `returning_home` | `abort`                                             | `aborted`        | drone descends and lands **in place**                           |
| `active`, `paused`, `returning_home` | battery reaches 0 % before landing                  | `failed`         |                                                                 |
| `active`, `paused`, `returning_home` | unrecoverable simulator error                       | `failed`         | if `start` itself fails, the mission stays `ready`              |

`completed`, `aborted`, and `failed` are terminal. Commands sent in a state that does not allow them are rejected
with HTTP `409` and code `invalid_transition`; the server is the only authority on the current state.

Only missions in `draft` or `ready` can be edited or deleted. Running or finished missions are read-only.

## 6. Events and failsafes

Every event becomes a `MissionEvent` with a type, a timestamp, the telemetry sequence it happened at, and a
human-readable message. The timeline in the live screen and the report is built from these events.

| Event                              | When                                | Automatic response                      |
| ---------------------------------- | ----------------------------------- | --------------------------------------- |
| `takeoff`                          | simulator starts                    | —                                       |
| `waypoint_reached`                 | within 1 m of a waypoint            | hover 3 s                               |
| `paused` / `resumed`               | operator command                    | —                                       |
| `low_battery`                      | battery drops below **30 %**        | warning only                            |
| `critical_battery`                 | battery drops below **20 %**        | automatic return home                   |
| `link_lost`                        | simulated drone link is lost        | keep flying the plan for up to **10 s** |
| `link_restored`                    | link comes back within 10 s         | —                                       |
| `link_failsafe`                    | link lost for more than 10 s        | automatic return home                   |
| `return_home_started`              | any cause                           | event records the cause                 |
| `landed`                           | altitude 0 at the end of the flight | then the terminal event                 |
| `completed` / `aborted` / `failed` | terminal state reached              | simulator stops and releases resources  |

### Two different "connection losses"

These are easy to confuse, so the demo shows them separately:

1. **Drone link loss** (simulated, server side): the aircraft loses contact with the operator. Handled by the
   failsafe above.
2. **App connection loss** (real, client side): the phone loses its WebSocket. The simulation keeps running on the
   server. On reconnect the client receives a fresh snapshot and continues from the latest sequence number, with no
   duplicate telemetry or listeners.

## 7. Simulator determinism

- Telemetry is produced on a fixed tick of **200 ms of simulated time** (5 Hz).
- The simulator takes a **seed** and an injectable **clock**. The same mission, seed, and command sequence always
  produce the same telemetry. Unit tests advance the clock directly; they never sleep.
- The seed only drives small cosmetic variation (±0.3 m/s speed jitter, ±0.5 m altitude jitter). Battery and
  state transitions are fully deterministic.
- `timeScale` speeds up simulated time relative to the wall clock. Default **1**. Demo mode uses **10**, so a
  5-minute mission plays in about 30 seconds.
- Sequence numbers start at 1 for each flight and increase by exactly 1 per telemetry message.

## 8. Demo mode

Demo controls are only available when the API runs with `DEMO_MODE=true`. They are rejected with `403` otherwise.

| Control                | Effect                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Inject low battery     | battery is set to **19 %**, which immediately triggers `critical_battery` and return home |
| Inject drone link loss | starts a link loss; choose 5 s (recovers) or 15 s (failsafe)                              |
| Drop app connection    | server closes this client's WebSocket once, to demonstrate reconnection                   |

## 9. Default demo location

Seeded missions fly over **Parque das Nações, Lisbon**, near the Web Summit venue (MEO Arena / FIL), mostly above
the Tejo riverfront. Default map centre: `38.7685, -9.0930`, zoom 15.

> Real-world note: this area is close to Lisbon Humberto Delgado Airport and lies in controlled airspace. Flying a
> real drone there would need authorization. It is used here only because it is recognisable to the demo audience.
