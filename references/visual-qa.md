# Visual QA and proof

How to verify frontend work and report it honestly. The rule: **no receipt, no claim.**
The final answer may only assert checks that were actually run and passed.

## Contents

1. [Proof tiers](#1-proof-tiers)
2. [The report](#2-the-report)
3. [Running checks with the CLI](#3-running-checks-with-the-cli)
4. [When the CLI or a tier is unavailable](#4-when-the-cli-or-a-tier-is-unavailable)
5. [Tier 2 checklist](#5-tier-2-checklist)
6. [Content stress pass](#6-content-stress-pass)
7. [Tier 3 human checklist](#7-tier-3-human-checklist)
8. [Writing the final answer](#8-writing-the-final-answer)

## 1. Proof tiers

| Tier | What runs | Requires |
|---|---|---|
| T0 code-level | Slop Lint (static), token usage, contrast math, contract validation | Node |
| T1 static | the project's own lint, type-check, tests, build (detected, never invented) | project tooling |
| T2 rendered | screenshots at 320/375/768/1280/1920; overflow; axe scan; keyboard walk; focus visibility; reduced-motion and forced-colors emulation; light/dark; content stress | Playwright + axe-core |
| T3 human | a generated review checklist | the user |

"Highest tier reached" is the highest tier whose checks all ran (passed or failed with
evidence). A tier where checks were skipped is not reached.

## 2. The report

`craft report` writes `.craft/reports/latest.json` (schema: `cli/schemas/report.schema.json`)
and `latest.md`. It records: run id, timestamps, a content hash of the source files (so a
stale report is detectable), tooling detected, tiers attempted, each check as `verified`
(with evidence), `not_verified` (with reason), or `failed` (with evidence), findings with
rule id, file, line, severity, and confidence, exceptions used, and the highest tier reached.

A report older than the latest source edit is stale and cannot back claims.

## 3. Running checks with the CLI

Run the bundled CLI with Node: `node <skill-dir>/cli/bin/craft.js <command> --json`.

| Command | Purpose |
|---|---|
| `craft doctor` | detect Node, package manager, framework, styling, Playwright, axe |
| `craft init` | scaffold `.craft/` from templates, never overwriting (`--from-repo` drafts tokens from the project) |
| `craft lint` | T0 findings, all static rules |
| `craft contrast` | WCAG checks for token pairs |
| `craft audit` | T1: run the project's own lint, type-check, test, and build scripts |
| `craft shoot` | T2: render pages in Chromium (needs Playwright and axe-core in the project) |
| `craft report` | the proof report; folds in fresh `audit` and `shoot` results |

Exit codes: 0 ok, 1 findings at or above `--fail-on`, 2 usage error, 3 tool or environment
unavailable. Check `craft --version`; a command that exits 3 (not in the installed version, a missing
dependency, or no Playwright) is a not-verified check, not a pass.

## 4. When the CLI or a tier is unavailable

- No Node or no CLI: perform the checks by inspection where possible and label them
  "checked by inspection (no tool)". Do not call them verified.
- No Playwright: do not install it without the user's explicit approval. Ask once,
  offering the exact pinned install command; if declined, stop at T1 and say why.
- No way to render: write "Rendered checks not run: <reason>" in the answer and include
  the Tier 3 checklist so the user can check by hand.
- Never describe how a page looks unless you rendered it or the user showed it to you.

## 5. Tier 2 checklist

When rendering is available (via `craft shoot` or your own browser tooling):

- [ ] Screenshots at 320, 375, 768, 1280, 1920 px; look at each
- [ ] No horizontal overflow at 320 px (`rsp/overflow`)
- [ ] axe scan with no serious or critical violations (or each one listed)
- [ ] Tab through the page: order logical, focus always visible, no traps
- [ ] Reduced motion emulated: no travel, parallax, or autoplay
- [ ] Forced colors emulated: controls and focus still visible
- [ ] Light and dark themes both checked
- [ ] Touch targets at least 44×44 px on touch layouts

## 6. Content stress pass

Render with: long strings (3× sample length, unbroken URLs), empty states, 0/1/1000 items,
RTL (`dir="rtl"`), and 200 % text zoom. Record which variants were rendered.

## 7. Tier 3 human checklist

Generate a short, specific list for the user, for example:

- Does the signature move read as intended on the home page?
- Screen reader pass on the checkout form (labels, errors, order)?
- Real content in place of `data-craft-illustrative` blocks?
- Does the dashboard still read well with your production data volume?

## 8. Writing the final answer

Lead with the highest tier reached, then verified checks, then what was not verified:

```markdown
Highest tier reached: T1 (static). Report: .craft/reports/latest.md (fresh)
Verified: craft lint (0 block, 2 warn), craft contrast (26/26 pairs AA), npm run typecheck, npm run build
Not verified: rendered checks (Playwright not installed; user declined install)
Checked outside the receipt: none
Human checks: <Tier 3 list>
```

Anything you checked with your own script or browser, not through `craft`, goes only on the
"Checked outside the receipt" line, with what it covered. It is never "Verified", and it is
not repeated as a plain sentence elsewhere. Prefer `craft shoot --file <page>` so it becomes a
receipt. Tasks for the user go only under "Human checks".

Forbidden: "fully accessible", "pixel perfect", "responsive on all devices", "production
ready", or "tested" without a verified check that supports the exact claim.
