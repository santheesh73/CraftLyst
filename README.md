# Frontend Craft

*Better frontend decisions. Better interfaces. Less AI slop.*

Frontend Craft is an open-source skill for AI coding agents (Claude Code first) that
improves the whole frontend process: Understand → Discover → Decide → Implement → Evaluate.

Most frontend skills give agents advice. Frontend Craft adds a contract, checks, and proof:

- **Contract**: a design direction stored in your repo (`.craft/`) that persists across sessions.
- **Checks**: executable audits (the `craft` CLI and its "Slop Lint" rules) instead of prose rules.
- **Proof**: the agent may only claim what a generated report supports ("no receipt, no claim").
- **Benchmark**: a paired evaluation harness that compares the skill with a baseline.

## Status

This project is built in gated phases. Nothing below is claimed beyond what is marked done.

| Phase | Scope | State |
|---|---|---|
| P0 Foundation | plan, ADRs, schemas, CI skeleton | done (CI green on Node 20 and 22) |
| P1 Skill core (v0.1) | `SKILL.md`, references, templates, packaging, trigger tests | built; trigger accuracy 96 %; the human gate (3 real projects) was waived by the user for lack of time, not run |
| P2 CLI (v0.2) | all `craft` commands and lint rules, proof reports | built, CI green; false-positive rate 9.4 % on held-out repos (judged by Claude) |
| P3 Evaluation (v0.3) | 12 briefs, rubric, paired harness | built; two-brief dry run with the real agent; **blind human ranking pending** |
| P4 Catalog (v0.4) | 30 entries, validation, offline search | built; precision on 20 queries judged by Claude (top-1 relevant 18/20) |
| P5 Contracts and tokens (v0.5) | 12 contracts, conformance kit, token adapters | built; kit run on Radix (71 pass, 2 fail) and React Aria (75 pass, 0 fail) |
| P6 1.0 | other-agent adapters, release prep | built; Codex, Cursor, others untested; `v1.0.0` tag held for the user's decision |

See [PLAN.md](PLAN.md) for gates and [docs/decisions/](docs/decisions/README.md) for ADRs.

## Install

```sh
npm ci && npm run package
node dist/frontend-craft/install.mjs install --agent auto --target ./my-app   # add --dry-run to preview
node dist/frontend-craft/install.mjs list                                     # all supported agents
```

One installer covers Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, Windsurf, Cline,
Roo Code, Kilo Code, opencode, Zed, Amp, Junie, Goose, Augment, Qwen Code, Continue, Aider, and
any agent that reads `AGENTS.md`. Every agent's status, the official doc its install path comes
from, and what has been verified are in [docs/compatibility.md](docs/compatibility.md). Only
installation is checked automatically; no agent is marked Supported until a person runs the
behavior check. See [docs/installation.md](docs/installation.md) for the release zip, the npm
tarball, user-level installs, `verify`, `update`, and `uninstall`, and [docs/usage.md](docs/usage.md)
for the CLI.

The CLI ships `doctor`, `scan` (reads the project's existing design system), `init` (with `--from-repo`), `lint` (20 Slop Lint rules, see
[docs/rules.md](docs/rules.md)), `contrast`, `audit` (Tier 1), `shoot` (Tier 2, needs
Playwright and axe-core), `report`, `catalog validate`, `index build`, `search`, and
`tokens build`.

Steps that need a person are listed in [docs/human-gates/](docs/human-gates/README.md).

## Development

Requires Node 20 or newer.

```sh
npm ci
npm run check   # lint, type-check, tests, schema validation
```

## License

Code is licensed under [Apache-2.0](LICENSE). Documentation, references, and catalog
metadata are licensed under [CC-BY-4.0](LICENSE-docs). See [NOTICE.md](NOTICE.md).
