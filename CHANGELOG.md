# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Schemas carry their own
`schemaVersion`, versioned separately from the skill.

## [Unreleased]

### Added

- Build plan (`PLAN.md`) and ADRs 0001–0011.
- JSON schemas (draft 2020-12 subset) for tokens, config, reports, recipes, and catalog entries, with valid and invalid examples.
- In-house schema validator (`cli/src/schema.js`) with unit tests.
- Dependency-free repository lint (`scripts/lint.js`).
- CI workflow: lint, type-check, tests, schema and SKILL.md validation, package build and checksum verification on Node 20 and 22.
- `SKILL.md` (v0.1) with the contract, proof, and honesty rules, triage (S/M/L), and four modes.
- 16 references: design intelligence, Direction Engine, anti-slop rules, critique, reference analysis, color and tokens, typography and spacing, layout, components, motion, responsive, accessibility, frontend engineering, visual QA, framework adapters, immersive and 3D.
- Templates for `.craft/` (`DESIGN.md`, `tokens.json`, `decisions.md`, `craft.config.json`); the token template passes WCAG AA on all 26 declared pairs.
- Direction Engine data (`tokens/recipes.json`) with schema, precedence, and conflict rules.
- Minimal `craft` CLI: `doctor`, `init`, `lint` (`ctr/contract`), `contrast`; planned commands exit 3 with the version that adds them.
- Reproducible packaging (`npm run package`), `SHA256SUMS`, `npm run verify-package`, and `scripts/install-claude-code` with `--dry-run`.
- 50 skill trigger prompts and a headless Claude Code runner (`evals/triggers/`).
- Docs: installation, usage, customization, compatibility, licensing.
