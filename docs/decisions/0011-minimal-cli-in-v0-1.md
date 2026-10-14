# ADR-0011: Minimal CLI in v0.1

- Status: accepted
- Date: 2026-10-14

## Context

The spec builds the full CLI in P2, but the P1 package must "include the built CLI" and
the human gate tests whether the contract persists across sessions.

## Decision

v0.1 ships a minimal `craft` with `doctor`, `init` (templates into `.craft/`, never
overwriting), `contrast` (token pairs), and `lint` restricted to `ctr/contract`. Other
commands exit 3 with a message naming the version that adds them. `SKILL.md` tells the
agent to report unavailable checks as not verified.

## Consequences

Users can try the contract workflow now. Nothing claims rules that do not exist yet.
