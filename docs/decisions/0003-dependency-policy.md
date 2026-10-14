# ADR-0003: Dependency policy and dev-only tooling

- Status: accepted
- Date: 2026-10-14

## Context

Supply-chain risk grows with every dependency, and the CLI runs inside users' repos.

## Decision

- At most 5 pinned runtime dependencies in total, limited to CSS and HTML/JSX parsing (see ADR-0005).
- Exact versions only (no `^` or `~`), committed `package-lock.json`, `npm ci` in CI.
- Dev dependencies are allowed when they do not ship in the package. Current dev dependencies:
  - `typescript` (exact pin): runs `tsc --checkJs --noEmit` over `cli/src` and `scripts`. No emitted output is used.
  - `@types/node` (exact pin): Node API types for the type-check.
- Playwright and axe-core are never dependencies. The CLI offers to install pinned versions into the user's project only after explicit approval (designed in P2).

## Consequences

The installed skill carries no `node_modules` until P2 adds parsers. Anything that can
be done in ~100 lines of our own code (schema validation, zip writing, repo lint) is
done in-house and tested.
