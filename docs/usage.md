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

## CLI (v0.1)

Run with `node <skill-dir>/cli/bin/craft.js`, or `craft` if it is on your PATH.

| Command | What it does | Exit codes |
|---|---|---|
| `craft doctor [--json]` | detects Node, package manager, framework, styling, Tier 1 scripts, Playwright, axe, contract | 0, or 3 if Node < 20 |
| `craft init [--json]` | writes `.craft/DESIGN.md`, `tokens.json`, `decisions.md`, `craft.config.json`, `.gitignore`; never overwrites | 0 |
| `craft lint [path] [--fail-on block\|warn] [--json]` | runs `ctr/contract` | 0 ok, 1 findings at or above fail level |
| `craft contrast [--tokens file] [--json]` | WCAG 2.x AA for every `pairs` entry in every theme | 0 all pass, 1 any fail, 3 no token file |

Common options: `--cwd <dir>` (project root), `--json`, `--help`, `--version`.

Commands planned for later versions (`audit`, `shoot`, `report`, `index`, `search`,
`catalog`, `tokens`) exit 3 with the version that adds them, so an agent reports those
checks as not verified rather than passing them.

## The contract

`.craft/` lives in your repository and should be committed (except `reports/`, which
`craft init` gitignores). Edit it like any other source file. Keep `DESIGN.md` under 150
lines; move rationale into `decisions.md`.
