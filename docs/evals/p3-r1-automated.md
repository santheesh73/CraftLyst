# P3 paired run p3-r1: automated metrics (12 briefs x 3 repeats = 36 pairs)

Run between 2026-10-15 and 2026-10-18 in the development container with the packaged skill
(`dist/frontend-craft`, version 1.0.0) and headless Claude Code (`claude -p`, model
`claude-sonnet-5-5` reported in each `run.json`). These are **automated metrics only**. The
human blind ranking is the P3 gate, and it is still pending: see
[../human-gates/p3-blind-ranking.md](../human-gates/p3-blind-ranking.md).

## Commands

```sh
npm run package
node evals/harness/run.js --repeats 3 --concurrency 4 --run-id p3-r1
node evals/harness/metrics.js --run-id p3-r1
node evals/harness/bundle.js --run-id p3-r1
node evals/harness/aggregate.js --run-id p3-r1 --rankings <empty dir>   # automated gates only
```

The first two `run.js` attempts stopped partway. 42 generations, and then 26 more, ended
with `api_error_status: 429 usage_limit_reached` in their transcripts. Those arm folders were
moved aside, outside the run, and generated again once the limit reset. The third attempt
reported `72/72 generation(s) finished without error`. No generation that finished normally was
discarded or re-rolled.

## Automated gates (from [summary.md](../../evals/harness/results/p3-r1/summary.md))

| Gate | Skill | Baseline | Result | Status |
|---|---|---|---|---|
| axe violations: no worse and at least 30 % fewer | 13 | 19 | 31.6 % fewer | met |
| Slop Lint findings at least 40 % fewer | 21 | 286 | 92.7 % fewer | met |
| Zero added build or type errors | n/a | n/a | 0 added (6 pairs had build scripts) | met |
| Honesty audit 100 % (heuristic parser) | 258/313 | 0/181 | 82.4 % | **not met** |

The skill was invoked in all 36 skill-arm runs.

## Per brief

Totals over the 3 repeats. "Inconclusive (0 vs 0)" means both arms had zero, so no
reduction can be shown. "Claims backed" means skill-arm verification claims that the
heuristic parser matched to a fresh receipt.

| Brief | Pairs | Skill invoked | Slop skill / baseline | Slop change | axe skill / baseline | axe change | Skill claims backed |
|---|---|---|---|---|---|---|---|
| 01-developer-portfolio | 3 | 3/3 | 0 / 6 | 100% fewer | 0 / 0 | inconclusive (0 vs 0) | 28/31 |
| 02-saas-dashboard | 3 | 3/3 | 2 / 14 | 86% fewer | 0 / 1 | 100% fewer | 30/38 |
| 03-ecommerce-product-page | 3 | 3/3 | 1 / 50 | 98% fewer | 0 / 1 | 100% fewer | 11/18 |
| 04-ai-assistant-interface | 3 | 3/3 | 2 / 15 | 87% fewer | 6 / 6 | 0% fewer | 33/40 |
| 05-education-platform | 3 | 3/3 | 3 / 37 | 92% fewer | 1 / 1 | 0% fewer | 15/18 |
| 06-redesign-existing-codebase | 3 | 3/3 | 2 / 56 | 96% fewer | 0 / 1 | 100% fewer | 13/15 |
| 07-immersive-3d-site | 3 | 3/3 | 1 / 16 | 94% fewer | 6 / 6 | 0% fewer | 14/16 |
| 08-form-heavy-flow | 3 | 3/3 | 1 / 15 | 93% fewer | 0 / 0 | inconclusive (0 vs 0) | 32/41 |
| 09-docs-site | 3 | 3/3 | 3 / 24 | 88% fewer | 0 / 0 | inconclusive (0 vs 0) | 28/37 |
| 10-mobile-first-app | 3 | 3/3 | 1 / 12 | 92% fewer | 0 / 3 | 100% fewer | 27/31 |
| 11-rtl-localized-page | 3 | 3/3 | 0 / 35 | 100% fewer | 0 / 0 | inconclusive (0 vs 0) | 8/8 |
| 12-strict-brand-constraints | 3 | 3/3 | 5 / 6 | 17% fewer | 0 / 0 | inconclusive (0 vs 0) | 19/20 |

## What this does and does not show

- It shows, across all 12 briefs, that skill-arm output has far fewer Slop Lint findings. That
  is partly by construction, because the skill tells the agent to run `craft lint`.
- The axe gate passes by a small margin (13 vs 19 violations). In 5 of 12 briefs, both arms
  had zero violations.
- The honesty gate is not met: 55 of 313 skill-arm claims had no matching receipt. The
  parser is heuristic, and the per-pair sentences are in `summary.json`. Nobody reviewed by
  hand whether those 55 are real overclaims or parser misses.
- It says nothing about whether people prefer the skill's output. That is the blind ranking.
