# Usage

## With an agent

Ask for frontend work as usual ("build a pricing page", "review the signup form"). When the
skill triggers, the agent:

1. Reads `.craft/DESIGN.md` and `.craft/tokens.json` if present.
2. Creates a contract for new projects (Direction Engine) or extracts one from an existing
   design system.
3. Implements using tokens, with states, accessibility, and responsiveness.
4. Runs the checks available in the installed version.
5. Reports the highest proof tier reached and only the checks that ran.

## CLI

Run with `node <skill-dir>/cli/bin/craft.js`, or `craft` if it is on your PATH.

| Command | What it does | Exit codes |
|---|---|---|
| `craft doctor [--json]` | detects Node, package manager, framework, styling, Tier 1 scripts, Playwright, axe, contract | 0, or 3 if Node < 20 |
| `craft init [--from-repo] [--json]` | writes `.craft/DESIGN.md`, `tokens.json`, `decisions.md`, `craft.config.json`, `.gitignore`; never overwrites. `--from-repo` drafts `tokens.json` from the project's custom properties and Tailwind config | 0 |
| `craft lint [paths] [--rules a,b] [--fail-on block\|warn] [--json]` | Tier 0 Slop Lint, all static rules ([docs/rules.md](rules.md)) | 0 ok, 1 findings at or above fail level |
| `craft contrast [--tokens file] [--json]` | WCAG 2.x AA for every `pairs` entry in every theme | 0 all pass, 1 any fail, 3 no token file |
| `craft audit [--scripts a,b] [--timeout s] [--dry-run]` | Tier 1: runs the project's lint, typecheck, test, and build scripts with `CI=1`, or `tier1.commands` from config; saves `.craft/reports/audit.json` | 0 all pass, 1 any fail |
| `craft shoot --url <loopback url> \| --file <html>` | Tier 2: Playwright + axe-core at 320–1920 px, keyboard walk, reduced motion, 200% zoom, RTL, forced colors; saves `.craft/reports/shoot.json` and screenshots | 0 pass, 1 fail, 3 Playwright or axe missing (prints the pinned install command) |
| `craft report [--check]` | runs Tier 0, folds in fresh Tier 1 and 2 results, writes `.craft/reports/latest.json` and `latest.md`; `--check` tells whether the report still matches the files | write: 0, or 1 if blocking findings (or warnings with `--fail-on warn`) or a failed check. `--check`: 0 fresh, 1 stale, missing, or invalid |
| `craft catalog validate [--catalog dir] [--today YYYY-MM-DD] [--fail-on block\|warn] [--json]` | validates bundled and `.craft/catalog/` entries: schema, trust, lifecycle, provenance, license allowlist; stale `verified_on` (over 12 months) is a warning | 0 ok, 1 errors (or warnings with `--fail-on warn`), 2 bad `--today`, 3 no entries |
| `craft index build [--catalog dir] [--json]` | builds `.craft/catalog-index.json` from bundled entries plus `.craft/catalog/*.json`; invalid entries are left out and listed | 0 ok, 1 some entries invalid (index still written), 3 no entries |
| `craft search "<intent>" [--axes k=v,...] [--stack list] [--trust L1,L2] [--category c] [--limit n] [--json]` | offline search; 3-5 compact cards (id, title, trust, status, intent, score, entry file); never full entries | 0 ok (also with zero results), 2 usage, 3 no index |
| `craft tokens build [--tokens <file>] [--out <dir in .craft/>] [--json]` | Emit tokens.css, tailwind.v3.cjs/.mjs, tailwind.v4.css into `.craft/build/` | 0 written; 1 invalid tokens (schema, unresolved reference, unsafe value, name collision); 2 usage (bad subcommand, `--out` outside `.craft/`); 3 token file missing |
| `node contracts/conformance/run.js --adapter <file> [--components a,b] [--json] [--allow-network]` | Run the component conformance kit against any implementation | 0 all pass or n/a; 1 failures; 2 usage; 3 Playwright/axe-core/Chromium unavailable |

Common options: `--cwd <dir>` (project root), `--json`, `--help`, `--version`.
`--allow-network` lets `shoot` load non-loopback URLs; nothing else uses the network.

The report records the highest proof tier reached. Tier 1 and 2 results count only while
the content hash of the sources and contract still matches; after an edit they show as
not verified until re-run. Tier 3 (human review) is never claimed by the CLI.

Every command in the spec is available from 0.5.0. A check the environment cannot run
(for example Tier 2 without Playwright) exits 3, so an agent reports it as not verified.

### Claude Code Stop hook (opt-in)

`node scripts/install-claude-code.js --print-stop-hook` prints a Stop hook entry for your
settings. With it, Claude Code is asked to run `craft report` before it stops when the
report is missing, stale, or has blocking findings. See
[adapters/claude-code/README.md](../adapters/claude-code/README.md).

## The contract

`.craft/` lives in your repository and should be committed (except `reports/`, which
`craft init` gitignores). Edit it like any other source file. Keep `DESIGN.md` under 150
lines; move rationale into `decisions.md`.
