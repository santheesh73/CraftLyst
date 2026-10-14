# Paired evaluation harness (P3)

Measures whether the skill improves frontend output, by running the same agent on the same
brief with and without the skill installed, then comparing the two outputs blind (humans)
and with automated metrics (scripts). The two kinds of result are always reported
separately.

Briefs: [../briefs/index.json](../briefs/index.json). Rubric: [../rubric.md](../rubric.md).
Human step: [../../docs/human-gates/p3-blind-ranking.md](../../docs/human-gates/p3-blind-ranking.md).

## Pipeline

```sh
npm run package                                   # builds dist/frontend-craft (the skill arm installs it)
node evals/harness/run.js --repeats 3 --run-id r1 # 12 briefs x 3 = 36 pairs; spawns the agent
node evals/harness/metrics.js --run-id r1         # Slop Lint, axe + screenshots, build/type, honesty
node evals/harness/bundle.js --run-id r1          # anonymized A/B bundles + form.html, private key.json
#   ... raters fill each bundles/<pair>/form.html and return the JSON files ...
node evals/harness/aggregate.js --run-id r1 --rankings <dir>   # results/r1/summary.{md,json}
```

`run.js --dry-run` lists what would run without creating or spawning anything.

## What each step does

- **run.js**: per brief, repeat, and arm (`skill`, `baseline`), creates a fresh temp
  workspace outside the repository, copies the brief's seed (if any), installs the packaged
  skill into `.claude/skills/frontend-craft` for the skill arm only, and runs the agent
  command (`--agent-cmd`, with a `{prompt}` placeholder passed as one argument, no shell).
  The prompt is identical for both arms and never mentions the skill. The default command is
  headless Claude Code with `--setting-sources project` and stream-json output. The
  workspace, prompt, transcript, and final answer are kept under
  `runs/<runId>/<pairId>/<arm>/`. It never runs in CI.
- **metrics.js**: snapshots the agent's own `.craft/reports/latest.json` and checks its
  freshness, then measures a copy of the product files without `.craft/` and `.claude/`,
  so both arms are measured identically. Slop Lint counts exclude the `ctr/*` contract rules
  (they only check the skill's own files) and include inline `craft-allow` exceptions. axe
  violations are counted per rule and colour scheme from `craft shoot`. Build/type results
  come from `craft audit` when the output has a `package.json`.
- **Honesty audit (heuristic)**: the final answer is split into sentences; a sentence is a
  verification claim when it uses a verification verb (or sits under a "Verified" or
  "Checks" heading) and is not a disclaimer ("not verified", "could not"). Claims are
  categorised (accessibility, contrast, responsive, motion, build, lint, tier, rendered) and
  each must be backed by a `verified` check of the matching kind in a fresh `latest.json`.
  Everything else, including real checks the agent ran without recording them, counts as
  unbacked. It can miss paraphrased claims and misread quoted text; matched and unmatched
  sentences are recorded in `metrics.json` for review.
- **bundle.js**: per pair, puts the two outputs in `A/` and `B/` in an order drawn from a
  seeded PRNG; the seed and mapping are written only to `runs/<runId>/key.json`. Product
  files are copied without `.craft/` or `.claude/`, and comments that mention the tool are
  removed. Final answers are left out unless `--answers` is passed, because their structure
  can reveal the arm even when redacted. Every bundle is scanned for leaks; any leak fails
  the command.
- **aggregate.js**: unblinds rankings with `key.json`, scores skill wins 1, ties 0.5,
  losses 0, averages raters per pair, and reports the win rate over N pairs with a Wilson
  95% interval, per dimension and overall. Automated gates are computed from `metrics.json`.

## Gates

| Gate | Threshold | Kind |
|---|---|---|
| Blind win rate vs. baseline | >= 65% over N >= 30 pairs | human |
| axe violations | no worse, and >= 30% fewer | automated |
| Slop Lint findings | >= 40% fewer | automated |
| Build/type errors | zero added | automated |
| Honesty audit | 100% of skill-arm claims backed | automated (heuristic) |

Statuses: `met`, `not met`, `pending` (no or too few human rankings), `inconclusive` (the
baseline has zero, so a reduction is undefined), `not applicable` (no build step in any
pair). Any skill change re-runs the suite before release.

## Known limitations

- Skills and plugins configured at user level on the machine running the agent are visible
  to both arms equally; `run.json` records the skills each run saw.
- Model output varies run to run; that is why the gate needs N >= 30 pairs.
- React/Vite outputs are rendered from `dist/index.html` only if the build produced it.
