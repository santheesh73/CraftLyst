# Frontend Craft: build plan

Frontend Craft is an installable skill for AI coding agents plus a `craft` CLI.
It turns frontend advice into **Advice → Contract → Checks → Proof**.

This plan is the source of truth for scope, order, and gates. The task list at the
bottom is kept current with every commit group.

## Contents

1. [Environment record](#1-environment-record)
2. [Phases and exit gates](#2-phases-and-exit-gates)
3. [Milestones per phase](#3-milestones-per-phase)
4. [Risks](#4-risks)
5. [ADR list](#5-adr-list)
6. [Conventions](#6-conventions)
7. [Task list](#7-task-list)

## 1. Environment record

Detected by hand on 2026-10-14 in the build container (the logic later becomes `craft doctor`).

| Probe | Result | How checked |
|---|---|---|
| Node | v22.22.0 | `node -v` |
| npm | 10.9.4 | `npm -v` |
| git | 2.43.0 | `git --version` |
| Playwright | 1.56.1 available via `npx --no-install`; Chromium build 1194 in `/opt/pw-browsers` | `npx --no-install playwright --version`, `ls /opt/pw-browsers` |
| Network | outbound HTTPS works through a proxy (npm registry 200, platform.claude.com 200) | `curl -w "%{http_code}"` |
| zip / unzip | both present | `which zip unzip` |
| Claude Code CLI | 2.1.299, headless `claude -p` works | `claude -p "say hi"` |
| Node 20 | not installed locally; covered by the CI matrix only | n/a |

Consequences: Tier 2 work (P2, P5) can be tried locally with the pre-installed
Chromium. Trigger tests (P1) can run against real headless Claude Code. Node 20
results are only ever claimed from CI runs.

## 2. Phases and exit gates

| Phase | Version | Scope | Exit gate |
|---|---|---|---|
| P0 Foundation | n/a | plan, scaffold, licenses, CI skeleton, ADRs, schemas | CI green on skeleton; every schema validates its own examples |
| P1 Skill core | v0.1 | `SKILL.md`, 16 references, templates, `recipes.json`, packaging, install script, trigger tests | `SKILL.md` < 400 lines + valid frontmatter; package installs in a clean dir; trigger accuracy ≥ 90 % or shortfall reported; **HUMAN GATE**: user applies it to 3 real projects |
| P2 CLI | v0.2 | all commands and rules, report + staleness, T2 path, Stop hook, security tests | tests + CI green; sloppy fixture flagged, clean passes; T0 < 10 s on 500 files; no-network test; FP rate < 15 % |
| P3 Evals | v0.3 | 12 briefs, rubric, harness, metrics, dry run ≥ 2 briefs | harness end to end; **HUMAN GATE**: blind ranking meets section 8 thresholds |
| P4 Catalog | v0.4 | schema, validator, index, search, 30 entries, provenance gates, NOTICE generator | all entries valid; precision on 20 queries reported |
| P5 Contracts + tokens | v0.5 | 12 contracts, conformance kit, token adapters | kit runs against ≥ 2 external libraries, results reported honestly |
| P6 Adapters + 1.0 | v1.0.0 | other-agent adapters, security review, docs, release | verified installs only; tag `v1.0.0` |

A phase does not start until the previous gate is verified. Human gates stop work
until the user answers. P2 may proceed while the P1 human gate is open (the spec
only requires that gate before P3).

## 3. Milestones per phase

**P0**
- M0.1 plan + ADRs (`PLAN.md`, `docs/decisions/`)
- M0.2 scaffold + licenses + community files
- M0.3 schemas (`tokens`, `config`, `report`, `catalog`, `recipes`) + in-house validator + examples
- M0.4 CI skeleton (lint, type-check, tests on Node 20/22, schema validation)

**P1**
- M1.1 templates (`DESIGN.md`, `tokens.json`, `craft.config.json`, `decisions.md`) that pass our own contract and contrast checks
- M1.2 Direction Engine data (`tokens/recipes.json`) + schema
- M1.3 the 16 references
- M1.4 `SKILL.md`
- M1.5 minimal CLI (`doctor`, `init`, `contrast`, `lint` with `ctr/contract`) so the package carries a working CLI
- M1.6 packaging (`dist/frontend-craft/`, zip, `SHA256SUMS`) + `scripts/install-claude-code`
- M1.7 trigger tests (≥ 40 prompts) + runner + recorded results

**P2–P6**: milestones are planned at the start of each phase and appended here.

## 4. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Static heuristics produce noisy findings | users ignore the linter | every rule carries `confidence`; FP rate measured at P2 gate; retune before release |
| Skill over- or under-triggers | skill never used, or used for backend work | ≥ 40 trigger prompts with near-misses; iterate the description |
| Dependency creep | supply-chain risk, slower install | ≤ 5 runtime deps, each with an ADR; schema validation in-house |
| Fabricated claims (ours or the agent's) | loss of trust | "no receipt, no claim"; status reports label every claim |
| Third-party licensing in the catalog | legal exposure | SPDX allowlist; link-only when unverified; CI gate |
| Human gates stall the build | blocked phases | stop and ask clearly; continue only on work the gate does not block |
| Playwright unavailable on user machines | no Tier 2 | graceful fallback; report states the highest tier reached and why |
| Repo vs. installed package drift | works in repo, breaks when installed | package tests run in a clean temp directory |
| Skill body grows past limits | context cost, worse adherence | CI line-count check (< 400), references one level deep |

## 5. ADR list

Recorded in `docs/decisions/`. Status in brackets.

- ADR-0001 Record architecture decisions [accepted]
- ADR-0002 Project defaults: licenses, Node ≥ 20, ESM + JSDoc, `node:test` [accepted]
- ADR-0003 Dependency policy and dev-only tooling (TypeScript for `--checkJs`) [accepted]
- ADR-0004 In-house JSON Schema subset validator instead of a runtime dependency [accepted]
- ADR-0005 Runtime parser dependencies for P2 (CSS, HTML, JSX) [proposed; pinned at P2]
- ADR-0006 Repository layout and the repo-vs-package boundary [accepted]
- ADR-0007 Security policy: read-only default, no network without `--allow-network` [accepted]
- ADR-0008 Lint for this repository without ESLint (dependency-free repo lint script) [accepted]
- ADR-0009 Deterministic zip packaging without a zip dependency [accepted]
- ADR-0010 Trigger tests run against headless Claude Code [accepted]
- ADR-0011 Ship a minimal CLI in v0.1 [accepted]
- Planned: Tier 2 optional install flow (P2), report schema versioning (P2), catalog index format (P4), conformance harness design (P5).

## 6. Conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`), one milestone per commit group.
- Every status report labels each claim ✅ Verified (command + result), ⚠️ Not verified (reason), or ❌ Failed (fixed / open).
- No fabricated URLs, licenses, statistics, or attributions. Unverifiable facts get `verified_on: null` and `draft` status.

## 7. Task list

- [x] Environment detection recorded
- [x] PLAN.md + ADRs
- [x] P0 scaffold, licenses, community files
- [x] P0 schemas + validator + examples
- [x] P0 CI skeleton
- [ ] P0 gate: CI green on GitHub
- [ ] P1 templates
- [ ] P1 recipes.json + schema
- [ ] P1 16 references
- [ ] P1 SKILL.md
- [ ] P1 minimal CLI
- [ ] P1 packaging + install script
- [ ] P1 trigger tests
- [ ] P1 automatic gate
- [ ] P1 HUMAN GATE (user: 3 real projects)
