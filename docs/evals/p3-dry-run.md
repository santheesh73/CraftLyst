# P3 dry run: two briefs, end to end

Date: 2026-10-14. Purpose: show that the paired evaluation harness runs end to end with the
real agent. **This is not evidence about the skill.** Two pairs say nothing statistically;
the release gate needs N >= 30 blind-ranked pairs.

## What ran

| Step | Command | Wall time |
|---|---|---|
| Package the skill | `npm run package` | a few seconds |
| Generate (4 runs, in parallel) | `node evals/harness/run.js --briefs 01-developer-portfolio,03-ecommerce-product-page --concurrency 4 --timeout 900 --run-id p3-dry-run` | about 2.5 min (longest run 151 s) |
| Metrics | `node evals/harness/metrics.js --run-id p3-dry-run` | 18 s |
| Bundles | `node evals/harness/bundle.js --run-id p3-dry-run --seed p3-dry-run-2026-10-14` | under 1 s |
| Aggregate (no rankings) | `node evals/harness/aggregate.js --run-id p3-dry-run` | under 1 s |

Agent: Claude Code 2.1.299, headless (`claude -p ... --permission-mode bypassPermissions
--setting-sources project --output-format stream-json --verbose`), in a temp workspace
outside the repository. The init event reported the model as `claude-sonnet-5-5` for all
four runs. Both briefs are plain HTML/CSS.

| Pair | Arm | Duration | Turns | Cost reported by the CLI | Skill invoked |
|---|---|---|---|---|---|
| 01-developer-portfolio | baseline | 40 s | 5 | $0.12 | no |
| 01-developer-portfolio | skill | 72 s | 10 | $0.23 | yes |
| 03-ecommerce-product-page | baseline | 102 s | 7 | $0.26 | no |
| 03-ecommerce-product-page | skill | 151 s | 10 | $0.42 | yes |

All four generations exited 0. The committed summary is
[../../evals/harness/results/p3-dry-run/summary.md](../../evals/harness/results/p3-dry-run/summary.md)
(and `summary.json`); the workspaces, screenshots, and bundles stay in the git-ignored
`evals/harness/runs/`.

## Automated metrics per arm

| Pair | Arm | Slop Lint findings | axe violations | Build/type | Claims backed by receipts | Receipts |
|---|---|---|---|---|---|---|
| 01-developer-portfolio | skill | 0 | 0 | n/a (no package.json) | 0 of 3 | none written |
| 01-developer-portfolio | baseline | 2 (info) | 0 | n/a | 0 of 0 | none |
| 03-ecommerce-product-page | skill | 0 | 0 | n/a | 4 of 5 | fresh |
| 03-ecommerce-product-page | baseline | 18 (16 warn, 2 info) | 0 | n/a | 0 of 3 | none |

Gate status from `aggregate.js`: human blind ranking **pending**; axe **inconclusive** (both
arms 0, so a 30% reduction is undefined); Slop Lint **met** on these 2 pairs (0 vs 20);
build/type **not applicable** (no build step); honesty **not met** (4 of 8 skill-arm claims
backed).

## What these numbers can and cannot say

- They show the mechanics work: both arms ran, the skill arm installed and invoked the
  skill, the baseline did not see it, metrics were collected the same way for both arms,
  bundles were built with a private key and passed the leak scan, and the aggregate reports
  the human gate as pending.
- They cannot say the skill is better. Two pairs, one model, one run each.
- The Slop Lint metric is partly circular: the skill arm runs the same linter and fixes what
  it flags (most baseline findings are `tok/hardcoded` literal values). A Slop Lint
  reduction is expected and is a weak signal on its own; that is why the human ranking is
  the primary gate.
- Neither page had axe violations, so the axe gate could not discriminate on these briefs.
- The honesty audit is a heuristic. It found a real pattern: in the portfolio run the skill
  arm listed `craft lint` and `craft contrast` results under "Verified" but never ran
  `craft report`, so no receipt backs them. In the product-page run, one unbacked claim was
  an ad-hoc ID and ARIA reference check the agent ran with a script, which the audit counts
  as unbacked by design. The baseline's claims (for example "`node --check` passes") are
  unbacked because the baseline writes no receipts; the gate applies to the skill arm.
- User-level skills on this machine were visible to both arms (recorded in each
  `run.json`); this is the same for both arms but is a confound to remove for the real run
  if possible.

## Human step

The blind ranking is **PENDING** on the user. Instructions:
[../human-gates/p3-blind-ranking.md](../human-gates/p3-blind-ranking.md).

## Rerun after the skill revision (`p3-rerun-1`)

The honesty miss above led to one skill change (commit "fix(skill): build the final proof
summary from craft report"): `SKILL.md` now says to run `craft report` after the last edit
and to list as verified only what `latest.json` marks `verified`. The same two briefs were
then rerun with the same harness and the real agent:

    node evals/harness/run.js --briefs 01-developer-portfolio,03-ecommerce-product-page --concurrency 4 --run-id p3-rerun-1
    node evals/harness/metrics.js --run-id p3-rerun-1
    node evals/harness/bundle.js --run-id p3-rerun-1
    node evals/harness/aggregate.js --run-id p3-rerun-1

| Pair | Arm | Slop | axe | Claims backed | Receipts | Duration |
|---|---|---|---|---|---|---|
| 01-developer-portfolio | skill | 0 | 0 | 11/11 | fresh | 88 s |
| 01-developer-portfolio | baseline | 2 | 0 | 0/9 | missing | 49 s |
| 03-ecommerce-product-page | skill | 0 | 0 | 3/3 | fresh | 156 s |
| 03-ecommerce-product-page | baseline | 31 | 0 | 0/1 | missing | 79 s |

Automated gates on these 2 pairs: Slop Lint met (0 vs 33), honesty met (14/14, heuristic
parser), axe inconclusive (0 vs 0), build not applicable. Two pairs are still not evidence
about the skill; the 30-pair suite and the blind human ranking remain **pending**. Summary:
`evals/harness/results/p3-rerun-1/summary.md`.
