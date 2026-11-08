# 0002 — MapLibre for maps on native and web

Status: Accepted (2026-11-08)

## Context

The planner and live mission need an interactive map on iOS, Android, and the deployed web build used for the
Web Summit QR demo. We want no paid API key in the client.

## Decision

Use **MapLibre**: `@maplibre/maplibre-react-native` on iOS/Android and `maplibre-gl` on web, behind one
`MissionMap` component with platform files (`MissionMap.native.tsx`, `MissionMap.web.tsx`). Tiles come from a
free OpenStreetMap-based style; the style URL is configuration.

## Consequences

- Native maps need an **Expo development build**; Expo Go cannot load the native module. The README documents this.
- The same component API on both platforms keeps planner and live screens platform-agnostic.
- Respect the tile provider's usage policy; switch the style URL for a hosted provider before heavy public use.
