# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's "Report a vulnerability"
button on this repository's Security tab. Do not open a public issue.

## Design guarantees

These are enforced in code and, where noted, by CI (see ADR-0007):

- The CLI is read-only by default and writes only inside `.craft/` (and `dist/` during packaging).
- No network access unless `--allow-network` is passed. The repository lint (`scripts/lint.js`) rejects network module imports; a socket-level CI test is added in P2.
- No `eval`, no `new Function` (enforced by `scripts/lint.js`).
- Never downloads or executes remote code. Playwright and axe-core are installed only after explicit user approval, at pinned versions.
- No telemetry.
- Releases ship `SHA256SUMS`.

## Scripts and their capabilities

| Script | Reads | Writes | Spawns processes | Network |
|---|---|---|---|---|
| `scripts/lint.js` | repository files | nothing | no | no |
| `scripts/validate-schemas.js` | schemas, examples, templates, catalog | nothing | no | no |

This table is updated whenever a script is added. `scripts/lint.js` holds the
allowlist of files permitted to spawn processes.
