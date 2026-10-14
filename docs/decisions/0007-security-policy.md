# ADR-0007: Security policy

- Status: accepted
- Date: 2026-10-14

## Context

The CLI runs inside users' repositories, invoked by an agent. It must be safe by default.

## Decision

- Read-only by default. Writes only inside `.craft/` (and `dist/` during packaging).
- No network unless `--allow-network` is passed. A CI test (P2) fails if the CLI opens a socket without it.
- No `eval`, no `new Function`, no dynamic `import()` of user-controlled paths. Enforced by `scripts/lint.js`.
- Never downloads or executes remote code. Playwright/axe are installed only after explicit user approval, pinned.
- No telemetry.
- `SECURITY.md` lists every script and its capabilities. Releases ship `SHA256SUMS`.

## Consequences

Some conveniences (auto-installing browsers, update checks) are deliberately absent.
