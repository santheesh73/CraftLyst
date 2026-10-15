# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Schemas carry their own
`schemaVersion`, versioned separately from the skill.

## [Unreleased]

P1b: install for every coding agent. The old P6 adapter scope moved into P1b; P6 is now V3
verification and release (see PLAN.md).

### Added

- Added one installer for 18 coding agents plus any `AGENTS.md` reader: `node install.mjs` (also `frontend-craft` when installed from the npm tarball) with `install`, `uninstall`, `update`, `list`, `verify`, and `doctor`, and `--agent all|auto|<ids or aliases>`, `--scope project|user`, `--target`, `--home`, `--dry-run`, `--force`, `--json`. Exit codes 0 ok, 1 conflicts, 2 usage, 3 environment.
- Added adapters as data: `adapters/<agent-id>/adapter.json`, validated against `adapters/adapter-schema.json`. Each one records the official doc its paths come from and the date it was read (`docs/research/agent-docs.md`). Trae is listed as researched, not supported, because no official doc could be read.
- Added `scripts/generate-agent-docs.js`, which generates `adapters/README.md` and the agent table in `docs/compatibility.md` from the adapters and `adapters/verification.json` (`--check` in CI).
- Added V2 load checks for Claude Code, GitHub Copilot, and Gemini CLI: each agent's own CLI listed the installed skill. The other agents are marked not run, with the reason.
- Added the V3 agent smoke kit in `evals/agent-smoke/` (a HUMAN GATE per agent).
- Added the npm package layout in `dist/frontend-craft/package.json`: `bin` for `frontend-craft` and `craft`, `files`, `engines`, bundled parsers, and no `scripts`. The tarball installs offline. Publishing to npm is a HUMAN GATE and has not been done.
- Added ADR-0017 (adapters as data), ADR-0018 (pointer versus native install), and ADR-0019 (no install scripts or network).
- Added end-to-end installer tests against the packaged build. They install every agent, check that a second run changes nothing, check that the installed CLI lints exactly one page in a clean project with every agent installed (no self-scanning), and install the npm tarball offline.
- Added an `installer` CI job on Linux, macOS, and Windows with Node 20 and 22.

### Changed

- `scripts/install-claude-code.js` is now a thin wrapper around `install.mjs --agent claude-code`. Re-running it reports `unchanged` and exits 0, where it used to exit 3.
- The vendored parsers moved from `cli/node_modules/` to the package root `node_modules/` so `npm pack` keeps them.
- `craft lint` and the other file walkers now skip `.craft/`, `.frontend-craft/`, and every agent configuration directory the installer can write.
- Moved the `con/fabricated` rule and its fixtures to `cli/rules/content/` and `cli/fixtures/rules/content/`. CON is a reserved file name on Windows, so the repository could not be checked out there and the release zip could not be extracted. The rule id is unchanged.
- Moved the eval stub agent to `evals/fixtures/stub-agent.js` so `node --test` with no directory argument no longer runs it.

### Fixed

- `scripts/install-claude-code.js`, the Stop hook, and the repository scripts now run when started through a symlinked path. Before, they silently did nothing and exited 0, for example on macOS where the temp directory `/var` links to `/private/var`.

### Removed

- Removed `scripts/install-agent.js` and the Codex, Cursor, and other-agents adapter READMEs. `install.mjs` replaces them. Cursor now gets a native skill in `.agents/skills/` instead of an `.mdc` rule.

## [1.0.0] - 2026-10-14

P3 (evaluation), P4 (catalog), P5 (contracts and tokens), and P6 (adapters, release prep).
The `v1.0.0` tag is not created yet: it waits on the user's decision about the pending
P3 blind ranking (see `docs/human-gates/README.md`).

### Added

- Added 12 evaluation briefs (`evals/briefs/`, with a seed codebase for the redesign brief) and a 10-dimension rubric with anchored 1-5 descriptions (`evals/rubric.md`).
- Added the paired evaluation harness (`evals/harness/`): `run.js` (paired generations with and without the skill through a configurable agent command), `metrics.js` (Slop Lint, axe and screenshots, build/type, heuristic claims-vs-receipts honesty audit), `bundle.js` (anonymized A/B bundles with seeded order, private key, leak scan, static ranking form), `aggregate.js` (unblinding, win rate with Wilson 95% interval, automated gates, human and automated results reported separately).
- Recorded a two-brief dry run with the real agent (`docs/evals/p3-dry-run.md`); the human blind-ranking gate is pending.
- Pattern catalog: 30 independently authored L1 entry cards (8 page compositions, 10 components, 3 motion patterns, 6 specialized product surfaces, 3 design-system recipes), all CC-BY-4.0, status reviewed (author self-review).
- `craft catalog validate`: schema plus cross-field rules (L3 and tested need evidence, deprecation needs a note and a live replacement, link-only or unknown-redistribution entries stay draft and below L2, null `verified_on` means draft, L0 is reference-only, galleries are L0, license allowlist for bundled third-party code, no "production-ready" below L3, unique ids equal to file names); `verified_on` older than 12 months warns (`--today` for deterministic runs, `--fail-on warn` to fail).
- `craft index build`: indexes the bundled entries plus project entries in `.craft/catalog/` into `.craft/catalog-index.json`.
- `craft search "<intent>"`: offline BM25F search returning compact cards, with `--axes`, `--stack`, `--trust`, `--category`, `--limit` (default 5, 1-10); exits 3 with remediation when no index exists.
- ADR-0014: catalog index format and offline search.
- `scripts/build-index.js` (prebuilt `catalog/index/index.json`, `--check` in CI), `scripts/check-licenses.js` (license gate), `scripts/generate-notice.js` (NOTICE.md provenance section, `--check` in CI), `npm run catalog`.
- `docs/catalog-contribution.md`; catalog precision spot-check on 20 queries (`docs/evals/catalog-precision.md`, `scripts/eval/catalog-precision.js`).
- Component contracts for 12 components in `contracts/components/` (button, text field and validation, select/combobox, dialog, menu, tabs, tooltip/popover, accordion/disclosure, toast/alert, table with sort and filter, pagination, navigation): purpose, when not to use, states matrix, keyboard map, ARIA pattern, responsive rules, failure cases, guidance, and the check ids that cover each requirement.
- Conformance kit `contracts/conformance/`: JSON adapter format, 85 Playwright checks (keyboard, focus management, ARIA roles and states, axe-core per component region), Markdown and JSON results, and `run.js` with exit codes 0/1/2/3 (ADR-0015).
- Reference fixture (trust L1: test fixture, not a component library) that passes every check, and a deliberately broken fixture that fails checks in every component.
- Conformance runs against Radix Primitives and React Aria Components with demo pages and adapters in `contracts/conformance/targets/`; results, including failures and kit bugs found, in `docs/evals/conformance-results.md`.
- `craft tokens build`: writes `.craft/build/tokens.css` (CSS custom properties with light/dark mappings via `[data-theme]` and `prefers-color-scheme`), `tailwind.v3.cjs`/`.mjs` (Tailwind v3 preset), and `tailwind.v4.css` (Tailwind v4 `@theme`) from `.craft/tokens.json`; deterministic output; `--out` must stay inside `.craft/` (ADR-0016).
- Installer for other agents, `scripts/install-agent.js` (`--agent codex|cursor|generic`): copies the skill to `<project>/.frontend-craft/` and adds a marked `AGENTS.md` block or a Cursor project rule; adapter docs in `adapters/codex/`, `adapters/cursor/`, `adapters/other-agents/`. All three are untested in live agent sessions.
- `docs/human-gates/README.md`: every step reserved for a person, with its status.
- Release notes for 1.0.0 (`docs/release-notes/v1.0.0.md`).

### Changed

- The package ships `catalog/entries/` and a prebuilt `catalog/index/index.json`, so the installed skill searches offline.
- `NOTICE.md` third-party section is generated from catalog provenance between markers.
- `SKILL.md` step 4 (Discover) tells the agent to use `craft search` and read only the entries it uses.
- CI runs `npm run catalog` (validation, license gate, index and NOTICE freshness).
- The package now ships `contracts/` (specs, kit, fixtures; not the external demo targets) and `cli/src/tokens-build.js`.
- `references/color-and-tokens.md` no longer suggests a self-referencing Tailwind v4 `@theme` mapping; it points to `craft tokens build`.
- `SKILL.md` step 7: build the final proof summary from `craft report` (`latest.json`), not from raw command output. The P3 dry run showed claims without a fresh receipt; the rerun backed 14 of 14 claims.
- The "planned command" mechanism (exit 3 with a version) is removed: every command in the spec is available.
- PLAN.md records the P1 human gate as waived by the user for lack of time (2026-10-14), not passed.

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
