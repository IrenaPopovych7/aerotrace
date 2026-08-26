# AeroTrace implementation backlog

Status: Draft  
Product: Mobile-first UAV mission planner and flight simulator  
Purpose: React Native and Node.js portfolio project

## Delivery strategy

We will build thin vertical slices. A vertical slice crosses the UI, API, validation, and tests to produce one demonstrable behavior. This exposes integration problems early and keeps the project usable after each milestone.

Issue labels used below:

- `mobile`: Expo and React Native work
- `api`: Node.js backend work
- `shared`: contracts or repository-wide work
- `design`: UX and visual system work
- `testing`: automated or manual verification
- `learning`: issue includes a concept note
- `web3`: optional cryptographic verification work
- `priority:must`: required for the reliable demo
- `priority:could`: optional polish

## Milestone 0 — Product definition

### 1. Approve the AeroTrace MVP specification

Labels: `shared`, `priority:must`

Outcome: Replace the earlier personal-portfolio assumptions with the AeroTrace product definition.

Acceptance criteria:

- The primary user and 60–90 second demo story are documented.
- MVP capabilities and explicitly deferred features are documented.
- The role of simulation and the boundary from real drone control are clear.
- The optional Web3 capability can be removed without breaking the core product.

Learning focus: product scope, functional requirements, non-functional requirements.

### 2. Define mission safety and simulation rules

Labels: `shared`, `priority:must`

Outcome: Establish deterministic rules used by both the UI and telemetry simulator.

Acceptance criteria:

- Document units for location, distance, speed, altitude, time, and battery.
- Define waypoint limits, battery model, mission states, and return-to-home behavior.
- Define at least four simulated events: low battery, connection loss, pause, and completion.
- State clearly that AeroTrace is not certified flight-control software.

Learning focus: domain modeling and invariants.

### 3. Create low-fidelity screen flows

Labels: `design`, `priority:must`

Outcome: Agree on the information architecture before implementing components.

Acceptance criteria:

- Flows cover Missions, Planner, Live Mission, Flight Report, and Settings/About.
- Empty, loading, error, offline, and permission-denied states are represented.
- Phone and wide-screen layouts are considered.
- The Web Summit demo path is annotated.

Learning focus: user flows and state-driven UI design.

## Milestone 1 — Engineering foundation

### 4. Convert the repository into an npm workspace

Labels: `shared`, `priority:must`, `learning`

Outcome: Host the Expo client, Node.js API, and shared contracts in one repository.

Acceptance criteria:

- Workspace contains `apps/mobile`, `apps/api`, and `packages/contracts`.
- Root scripts start, type-check, lint, and test the workspace.
- The existing Expo starter still launches.
- README explains the repository structure and commands.

Learning focus: monorepos, package boundaries, dependency direction.

### 5. Add code-quality and test foundations

Labels: `shared`, `testing`, `priority:must`, `learning`

Outcome: Detect common mistakes before they reach the demo build.

Acceptance criteria:

- Formatting, linting, and strict TypeScript checks are configured.
- Mobile and API each have one passing example test.
- CI runs install, lint, type-check, and tests for pull requests.
- Commands produce useful errors when a check fails.

Learning focus: static analysis, test layers, continuous integration.

### 6. Create the Node.js API shell and health endpoint

Labels: `api`, `priority:must`, `learning`

Outcome: Run a typed API with production-shaped configuration.

Acceptance criteria:

- Fastify server starts from a documented command.
- `GET /api/v1/health` returns status and service version.
- Environment variables are validated on startup.
- Errors and requests use structured logging.
- The health route has an automated test.

Learning focus: Node.js runtime, HTTP lifecycle, configuration, dependency injection.

### 7. Add Expo Router and application shell

Labels: `mobile`, `priority:must`, `learning`

Outcome: Establish navigation and global providers.

Acceptance criteria:

- Routes exist for missions, planner, live mission, and report.
- Unknown paths show a useful fallback.
- Deep links can address a mission by identifier.
- Safe areas and status bar appearance work on iOS and Android.

Learning focus: file-based routing, layouts, route parameters, deep linking.

### 8. Create design tokens and reusable primitives

Labels: `mobile`, `design`, `priority:must`, `learning`

Outcome: Build a consistent visual foundation without a large UI framework.

Acceptance criteria:

- Color, spacing, radius, typography, and elevation tokens are defined.
- Button, text, card, screen, and status-badge primitives exist.
- Light and dark themes meet basic contrast requirements.
- Primitives support disabled, loading, pressed, and focus states.

Learning focus: design systems, composition, accessibility states.

## Milestone 2 — Mission planning vertical slice

### 9. Define shared mission schemas and state machine

Labels: `shared`, `priority:must`, `learning`

Outcome: Give mobile and API one runtime-validated contract.

Acceptance criteria:

- Schemas cover Mission, Waypoint, MissionEstimate, Telemetry, and MissionEvent.
- Mission states and allowed transitions are explicit.
- TypeScript types are inferred from runtime schemas.
- Valid and invalid fixtures have tests.

Learning focus: compile-time types versus runtime validation, finite-state machines.

### 10. Implement mission CRUD API with seeded persistence

Labels: `api`, `priority:must`, `learning`

Outcome: Create, list, view, update, and delete draft missions.

Acceptance criteria:

- Versioned REST endpoints implement the required operations.
- Inputs use the shared schemas.
- Not-found, conflict, and validation errors share one error shape.
- Seed data provides at least two useful missions.
- Route tests cover success and failure cases.

Learning focus: REST resources, status codes, persistence boundary, error handling.

### 11. Build mission list with server-state handling

Labels: `mobile`, `priority:must`, `learning`

Outcome: Display missions from the API with resilient UX.

Acceptance criteria:

- Missions are grouped or filtered by state.
- Loading, empty, error, refreshing, and cached-data states are implemented.
- Selecting a mission opens its correct detail or planner route.
- A retry does not create duplicate concurrent requests.

Learning focus: server state, query keys, caching, invalidation, asynchronous UI.

### 12. Build interactive waypoint planner

Labels: `mobile`, `design`, `priority:must`, `learning`

Outcome: Create and edit a mission visually on a map.

Acceptance criteria:

- Tapping the map adds a numbered waypoint.
- A waypoint can be selected, reordered, and removed.
- The route line updates when waypoint order changes.
- Invalid missions explain what must be corrected.
- Map permission denial does not block planning with the default demo location.

Learning focus: native maps, gestures, controlled state, platform permissions.

### 13. Calculate and display mission estimates

Labels: `api`, `mobile`, `shared`, `priority:must`, `learning`

Outcome: Show distance, duration, and battery estimate before flight.

Acceptance criteria:

- The calculation rules are centralized and tested.
- The planner updates estimates after waypoint changes.
- A reserve-battery warning appears when the estimate crosses the defined limit.
- Client and server agree on units and rounding.

Learning focus: geospatial calculations, derived state, authoritative business logic.

## Milestone 3 — Live mission simulation

### 14. Build deterministic telemetry simulator

Labels: `api`, `priority:must`, `learning`

Outcome: Simulate a drone following a planned route without hardware.

Acceptance criteria:

- A seed makes a run reproducible.
- Position, altitude, speed, battery, and progress update on a fixed cadence.
- Pause, resume, abort, and return-to-home commands are supported.
- The simulator emits mission events and reaches a terminal state safely.
- Unit tests use a controllable clock rather than real delays.

Learning focus: time-based systems, interpolation, deterministic testing.

### 15. Stream telemetry over WebSockets

Labels: `api`, `mobile`, `priority:must`, `learning`

Outcome: Deliver live mission state to the React Native client.

Acceptance criteria:

- The client subscribes to one mission by identifier.
- Connection, reconnecting, connected, and disconnected states are visible.
- Reconnection does not duplicate event listeners.
- Invalid subscriptions are rejected safely.
- Server heartbeat and cleanup behavior are tested.

Learning focus: WebSockets, subscriptions, connection lifecycle, cleanup.

### 16. Build live mission map and instrument panel

Labels: `mobile`, `design`, `priority:must`, `learning`

Outcome: Present the simulated flight as the centerpiece of the demo.

Acceptance criteria:

- Drone position animates along the route.
- Battery, altitude, speed, elapsed time, and progress are readable.
- Critical events produce accessible visual feedback.
- Controls prevent invalid commands for the current mission state.
- Background/foreground transitions restore the latest server state.

Learning focus: animation, high-frequency state, render performance, app lifecycle.

### 17. Add failure-scenario controls for demo mode

Labels: `api`, `mobile`, `priority:must`

Outcome: Reliably demonstrate system behavior under adverse conditions.

Acceptance criteria:

- Demo mode can trigger low battery and connection loss.
- Production-shaped code keeps demo controls isolated and disabled by configuration.
- Each event creates a timeline entry and appropriate UI response.
- The mission can recover or return home according to documented rules.

Learning focus: feature flags, fault injection, resilience.

## Milestone 4 — Flight reports and verification

### 18. Persist completed flight reports

Labels: `api`, `priority:must`, `learning`

Outcome: Turn a completed simulation into a reviewable flight record.

Acceptance criteria:

- Completion stores summary metrics, route, and event timeline.
- `GET /api/v1/flights/:id` returns the report.
- Incomplete missions cannot create completed reports.
- The API preserves measurement units and timestamps unambiguously.

Learning focus: transactional boundaries, immutable records, timestamps.

### 19. Build flight report screen

Labels: `mobile`, `design`, `priority:must`, `learning`

Outcome: Tell the story of a completed mission clearly.

Acceptance criteria:

- Report shows route, duration, distance, battery change, and event timeline.
- A compact chart communicates battery over time.
- The report supports loading, not-found, and offline-cached states.
- The report can be shared as a deep link.

Learning focus: data visualization, derived presentation models, native sharing.

### 20. Add tamper-evident report verification

Labels: `api`, `mobile`, `web3`, `priority:could`, `learning`

Outcome: Demonstrate useful cryptographic verification without requiring a blockchain.

Acceptance criteria:

- The server canonicalizes and hashes completed report data.
- A verification endpoint reports whether the stored record matches its hash.
- The app displays and shares a QR verification link.
- Tests prove that changing a protected field invalidates verification.

Learning focus: hashing, canonical serialization, integrity versus identity.

### 21. Anchor report hashes to a test network

Labels: `api`, `web3`, `priority:could`, `learning`

Outcome: Add an optional public timestamp/proof for selected reports.

Acceptance criteria:

- Blockchain integration is behind an adapter and feature flag.
- No private key ships in the mobile client.
- Pending, confirmed, and failed transaction states are modeled.
- The core report flow continues to work when the network is unavailable.
- Network and contract choices are recorded in an architecture decision.

Learning focus: blockchain boundaries, transaction finality, secret management.

## Milestone 5 — Demo readiness

### 22. Add offline and poor-network resilience

Labels: `mobile`, `api`, `priority:must`, `testing`

Outcome: Keep the main demo useful on conference Wi-Fi.

Acceptance criteria:

- Previously loaded missions and reports remain readable offline.
- Mutations have an explicit offline policy; none fail silently.
- Connection loss during simulation produces a recoverable UI state.
- A documented local demo mode works without a deployed API.

Learning focus: cache persistence, consistency tradeoffs, graceful degradation.

### 23. Complete accessibility and performance pass

Labels: `mobile`, `design`, `testing`, `priority:must`

Outcome: Make the app feel deliberate and professional.

Acceptance criteria:

- Primary flows work with screen-reader labels and keyboard navigation on web.
- Text scaling does not hide critical actions.
- Motion respects reduced-motion preferences.
- Telemetry updates do not cause avoidable whole-screen rerenders.
- Performance findings and fixes are documented.

Learning focus: accessibility APIs, profiling, memoization tradeoffs.

### 24. Deploy API and web build

Labels: `api`, `mobile`, `shared`, `priority:must`, `learning`

Outcome: Provide a stable public demonstration URL.

Acceptance criteria:

- Production environment variables and CORS origins are configured.
- API health is externally observable.
- Web deep links resolve correctly on refresh.
- Deployment steps and rollback procedure are documented.
- No secrets or debug-only controls are exposed.

Learning focus: builds, environments, hosting, observability.

### 25. Prepare and rehearse the Web Summit demo

Labels: `shared`, `testing`, `priority:must`

Outcome: Deliver a repeatable 60–90 second product story.

Acceptance criteria:

- A QR code opens the deployed application.
- Seeded mission data produces the expected demonstration.
- The demo is tested on the actual presentation devices.
- Poor-network and offline fallback paths are rehearsed.
- A short script and backup screen recording are available.

Learning focus: production readiness and technical storytelling.

## Recommended first release boundary

The first credible portfolio release includes issues 1–19 and 22–25. Issues 20 and 21 are optional Web3 extensions. This order ensures the app remains a strong React Native and Node.js project even if blockchain integration is removed.
