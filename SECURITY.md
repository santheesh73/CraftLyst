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
| `scripts/validate-skill.js` | `SKILL.md`, `references/` | nothing | no | no |
| `scripts/run-tests.js` | test files | temp dirs (via tests) | test runner only | no |
| `scripts/package.js` | repository files listed in the script | `dist/` only | no | no |
| `scripts/verify-package.js` | `dist/` | nothing | `unzip -t`, `unzip -Z1` | no |
| `scripts/install-claude-code.js` | the packaged skill | `~/.claude/skills/frontend-craft` or `<project>/.claude/skills/frontend-craft` only; replaces an existing install only with `--force`; `--dry-run` writes nothing | no | no |
| `cli/bin/craft.js` (`doctor`, `lint`, `contrast`) | project files, `.craft/` | nothing | no | no |
| `cli/bin/craft.js init` | templates | `.craft/` only, never overwrites | no | no |
| `evals/triggers/run.js` | prompt list, packaged skill | a temp project and `evals/triggers/results/` | `claude -p` (headless Claude Code), run manually, not in CI | via Claude Code only |

This table is updated whenever a script is added. `scripts/lint.js` holds the
allowlist of files permitted to spawn processes.
