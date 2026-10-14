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
| P1 Skill core (v0.1) | `SKILL.md`, references, templates, packaging, trigger tests | built; waiting on the human gate (use on 3 real projects) |
| P2 CLI (v0.2) | all `craft` commands and lint rules, proof reports | built, CI green, gate items met (FP rate judged by Claude) |
| P3 Evaluation (v0.3) | briefs, rubric, paired harness | not started |
| P4 Catalog (v0.4) | pattern catalog and offline search | not started |
| P5 Contracts and tokens (v0.5) | component contracts, conformance kit, token adapters | not started |
| P6 1.0 | other-agent adapters, release | not started |

See [PLAN.md](PLAN.md) for gates and [docs/decisions/](docs/decisions/README.md) for ADRs.

## Install (v0.2)

```sh
npm ci && npm run package
node scripts/install-claude-code.js --user     # or --project <dir>; add --dry-run to preview
```

See [docs/installation.md](docs/installation.md) and [docs/usage.md](docs/usage.md).
The CLI ships `doctor`, `init` (with `--from-repo`), `lint` (20 Slop Lint rules, see
[docs/rules.md](docs/rules.md)), `contrast`, `audit` (Tier 1), `shoot` (Tier 2, needs
Playwright and axe-core), and `report`.

## Development

Requires Node 20 or newer.

```sh
npm ci
npm run check   # lint, type-check, tests, schema validation
```

## License

Code is licensed under [Apache-2.0](LICENSE). Documentation, references, and catalog
metadata are licensed under [CC-BY-4.0](LICENSE-docs). See [NOTICE.md](NOTICE.md).
