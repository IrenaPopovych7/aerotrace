# 0001 — Zod for shared runtime contracts

Status: Accepted (2026-11-08)

## Context

Mobile and API must agree on Mission, Waypoint, Estimate, Telemetry and MissionEvent shapes, and the server must
reject unexpected fields at runtime. We want one source of truth that gives both runtime validation and TypeScript
types.

## Decision

Use **Zod** schemas in `packages/contracts`. Types are inferred with `z.infer`. Object schemas are `.strict()` on
inputs so unknown fields are rejected.

## Consequences

- Works unchanged in Expo (Hermes) and Node.
- Fastify uses Zod via a small adapter instead of its native JSON Schema; we accept a small performance cost.
- Alternatives considered: Valibot (smaller, less familiar to reviewers), TypeBox (fastest with Fastify, clumsier
  on the client).
