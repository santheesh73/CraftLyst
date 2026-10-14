# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's "Report a vulnerability"
button on this repository's Security tab. Do not open a public issue.

## Design guarantees

These are enforced in code and, where noted, by CI (see ADR-0007):

- The CLI is read-only by default and writes only inside `.craft/` (and `dist/` during packaging).
- No network access unless `--allow-network` is passed. The repository lint (`scripts/lint.js`) rejects network module imports outside an allowlist, and `scripts/test/no-network.test.js` runs every command under a guard that fails CI if a socket, UDP send, or DNS lookup is attempted.
- No `eval`, no `new Function` (enforced by `scripts/lint.js`).
- Never downloads or executes remote code. Playwright and axe-core are installed only after explicit user approval, at pinned versions (`craft shoot` prints the install command and exits 3 when they are missing).
- `craft audit` runs the project's own `lint`, `typecheck`, `test`, and `build` scripts (or `tier1.commands` from `craft.config.json`). Those are the project's code; craft only runs them when `craft audit` is invoked.
- `craft shoot` loads only loopback URLs and local files. Requests to any other origin are aborted and listed, unless `--allow-network` is passed.
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
| `cli/bin/craft.js init` (`--from-repo`) | templates; with `--from-repo`, project CSS and Tailwind config (parsed as AST, never executed) | `.craft/` only, never overwrites | no | no |
| `cli/bin/craft.js audit` | `package.json`, `.craft/craft.config.json` | `.craft/reports/audit.json` | the project's own scripts via its package manager, or `tier1.commands` through a shell; `--dry-run` spawns nothing | only what the project's scripts do |
| `cli/bin/craft.js shoot` | the given URLs or files | `.craft/reports/shoot.json`, `.craft/reports/shots/` | Chromium via Playwright, if installed | loopback only; other origins blocked unless `--allow-network` |
| `cli/bin/craft.js report` (`--check`) | `.craft/`, project files (content hash) | `.craft/reports/latest.json`, `latest.md`; `--check` writes nothing | no | no |
| `adapters/claude-code/hooks/stop-proof.js` (opt-in Stop hook) | hook input on stdin, `.craft/`, project files | nothing | no | no |
| `scripts/test/no-network.test.js` | CLI | temp dirs | `node --import` the guard, then each command | blocked and logged by the guard |
| `scripts/test/no-network-guard.js` | nothing | the log file named in `CRAFT_NET_GUARD_LOG` | no | patches `net`, `dgram`, and `dns` to refuse |
| `scripts/eval/sample.js` | a `craft lint --json` report | nothing | no | no |
| `cli/test/shoot.test.js` | test fixtures | temp dirs | Chromium via Playwright | a loopback test server only |
| `evals/triggers/run.js` | prompt list, packaged skill | a temp project and `evals/triggers/results/` | `claude -p` (headless Claude Code), run manually, not in CI | via Claude Code only |

CI installs Playwright's Chromium (`npx playwright install --with-deps chromium`, version pinned
by `package-lock.json`) so the Tier 2 tests run; users install it only when they choose to run
`craft shoot`.

This table is updated whenever a script is added. `scripts/lint.js` holds the
allowlist of files permitted to spawn processes.
