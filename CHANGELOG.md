# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Schemas carry their own
`schemaVersion`, versioned separately from the skill.

## [Unreleased]

## [0.2.0] - 2026-10-14

P2 (CLI). Built and CI-green; not yet released.

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
- Slop Lint (`craft lint`, Tier 0): 20 rules across tokens, layout, visual, motion, accessibility, responsive, content, immersive, and exceptions, parsing CSS (postcss), HTML/Vue/Svelte/Astro (parse5), and JSX/TSX (@babel/parser); fixtures for every rule; `craft-allow` exceptions with reasons.
- `craft init --from-repo`: drafts `tokens.json` from the project's CSS custom properties and Tailwind config (read as an AST, never executed).
- `craft audit` (Tier 1): runs the project's lint, typecheck, test, and build scripts, or `tier1.commands` from config.
- `craft shoot` (Tier 2): Playwright + axe-core at five viewports, keyboard walk, reduced motion, 200% zoom, RTL, and forced colors; loopback only unless `--allow-network`.
- `craft report` with a content hash over sources and contract; `craft report --check` detects stale reports.
- Opt-in Claude Code Stop hook (`adapters/claude-code/hooks/stop-proof.js`) that asks for a fresh proof report before the agent stops.
- CI test that fails if any command opens a socket, sends UDP, or resolves DNS without `--allow-network`.
- False-positive evaluation on 46 open-source repos in nine rounds (`docs/evals/false-positives.md`).
