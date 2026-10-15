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

## Security review for 1.0 (2026-10-14)

Done by Claude, not by an independent reviewer. Checked:

- Every file write in `cli/src/` lands inside `.craft/` (`init`, `report`, `audit`, `shoot`,
  `index build`, `tokens build`); `tokens build --out` is refused outside `.craft/`.
- Process spawning and network imports are limited to the allowlists in `scripts/lint.js`;
  the new CLI commands (`catalog validate`, `index build`, `search`, `tokens build`) spawn
  nothing and run under the no-network guard in `scripts/test/no-network.test.js`.
- The conformance kit loads only `file://` and loopback pages and aborts other requests
  unless `--allow-network` is passed; it writes nothing.
- The evaluation harness spawns the agent command and, through `craft audit`, the scripts of
  agent-generated projects. It is a developer tool: never run in CI, not shipped in the package.
- No `eval` or `new Function` anywhere (enforced by `scripts/lint.js`).

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
| `scripts/install-agent.js` (Codex, Cursor, generic) | the packaged skill, `SKILL.md` frontmatter, an existing `AGENTS.md` | `<project>/.frontend-craft/` and either the marked block in `<project>/AGENTS.md` (text outside the markers is kept) or `<project>/.cursor/rules/frontend-craft.mdc`; replaces only with `--force`; `--dry-run` writes nothing | no | no |
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
| `craft tokens build` | `.craft/tokens.json` or `--tokens <file>` | `.craft/build/` (or `--out`, refused with exit 2 unless inside `.craft/`) | nothing | none |
| `node contracts/conformance/run.js` | the adapter JSON and the page it names; Playwright and axe-core from the project or the CLI's install location | nothing (stdout only) | Chromium via Playwright | `file://` and loopback only; every other request is aborted unless `--allow-network` |
| `node contracts/conformance/targets/build.js` (repo-only, not packaged) | demo `main.jsx` files and `--modules <dir>` | `contracts/conformance/targets/<lib>/build/app.js` (gitignored) | nothing (esbuild JS API in process; esbuild itself runs its native binary) | none |

| `cli/bin/craft.js catalog validate` | bundled `catalog/entries/` (or `--catalog <dir>`), project `.craft/catalog/*.json` | nothing | no | no |
| `cli/bin/craft.js index build` | bundled entries, project `.craft/catalog/*.json` | `.craft/catalog-index.json` only | no | no |
| `cli/bin/craft.js search` | `.craft/catalog-index.json` if present, else the shipped `catalog/index/index.json`; `tokens/recipes.json` for axis names | nothing | no | no |
| `scripts/build-index.js` | `catalog/entries/` | `catalog/index/index.json` (or `--out <file>`); `--check` writes nothing | no | no |
| `scripts/check-licenses.js` | `catalog/entries/` | nothing | no | no |
| `scripts/generate-notice.js` | `catalog/entries/`, `NOTICE.md` | `NOTICE.md` (generated section only); `--check` and `--stdout` write nothing | no | no |
| `scripts/eval/catalog-precision.js` | `catalog/index/index.json` | nothing | no | no |
| `evals/harness/run.js` | briefs, seeds, the packaged skill | a temp workspace per run (removed after copying), `evals/harness/runs/<runId>/` | the agent command (`claude -p` by default), run manually, never in CI | via the agent only |
| `evals/harness/metrics.js` | `evals/harness/runs/<runId>/` | `<arm>/metrics.json` and `<arm>/eval/` (incl. `.craft/reports/` from `craft shoot`/`audit`) under the run | `node cli/bin/craft.js` (`lint`, `report --check`, `shoot`, `audit`); `audit` runs the generated project's own scripts | no; `shoot` is loopback-only |
| `evals/harness/bundle.js` | `evals/harness/runs/<runId>/`, briefs | `runs/<runId>/bundles/`, `runs/<runId>/key.json` | no | no |
| `evals/harness/aggregate.js` | `runs/<runId>/` metrics and key, ranking JSON files | `evals/harness/results/<runId>/summary.{md,json}` | no | no |
| `evals/test/harness.test.js` | harness, stub agent fixture | temp dirs | the harness scripts and the stub agent (`evals/test/fixtures/stub-agent.js`), never a real agent | no |

CI installs Playwright's Chromium (`npx playwright install --with-deps chromium`, version pinned
by `package-lock.json`) so the Tier 2 tests run; users install it only when they choose to run
`craft shoot`.

This table is updated whenever a script is added. `scripts/lint.js` holds the
allowlist of files permitted to spawn processes.
