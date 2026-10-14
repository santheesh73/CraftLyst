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

Common options: `--cwd <dir>` (project root), `--json`, `--help`, `--version`.
`--allow-network` lets `shoot` load non-loopback URLs; nothing else uses the network.

The report records the highest proof tier reached. Tier 1 and 2 results count only while
the content hash of the sources and contract still matches; after an edit they show as
not verified until re-run. Tier 3 (human review) is never claimed by the CLI.

Commands planned for later versions (`index`, `search`, `catalog`, `tokens`) exit 3 with
the version that adds them, so an agent reports those checks as not verified rather than
passing them.

### Claude Code Stop hook (opt-in)

`node scripts/install-claude-code.js --print-stop-hook` prints a Stop hook entry for your
settings. With it, Claude Code is asked to run `craft report` before it stops when the
report is missing, stale, or has blocking findings. See
[adapters/claude-code/README.md](../adapters/claude-code/README.md).

## The contract

`.craft/` lives in your repository and should be committed (except `reports/`, which
`craft init` gitignores). Edit it like any other source file. Keep `DESIGN.md` under 150
lines; move rationale into `decisions.md`.
