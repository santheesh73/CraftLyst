# ADR-0002: Project defaults

- Status: accepted
- Date: 2026-10-14

## Context

The kickoff spec fixes several defaults so the build does not stall on questions.

## Decision

- Code: Apache-2.0 (`LICENSE`). Docs, references, and catalog metadata: CC-BY-4.0 (`LICENSE-docs`).
- Node ≥ 20 (`engines` in `package.json`; CI matrix on Node 20 and 22).
- CLI in plain ESM JavaScript with JSDoc types, checked by `tsc --checkJs` in development only.
- Test runner: `node:test` with `node:assert/strict`.
- Supported project stacks: React/Next.js/Tailwind and plain HTML/CSS fully; Vue, Svelte, Astro at CSS level plus rendered checks.
- Playwright and axe-core are optional and installed on demand for Tier 2 only.

## Consequences

No build step for the CLI: the source is what ships. Types are documentation plus a
CI check, never a runtime cost.
