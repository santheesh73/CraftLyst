# P3 human gate: blind pairwise ranking

The P3 gate needs a person to compare skill and baseline outputs without knowing which is
which. Claude cannot do this step. Status: **PENDING**.

## 1. Generate at least 30 pairs (unattended, about 1 to 3 hours)

From the repository root, on a machine where `claude -p` works:

```sh
npm run package
node evals/harness/run.js --repeats 3 --concurrency 4 --run-id p3-r1
node evals/harness/metrics.js --run-id p3-r1
node evals/harness/bundle.js --run-id p3-r1
```

12 briefs x 3 repeats = 36 pairs. Costs and durations per run are recorded in each
`run.json` (the 4-run dry run cost about $1 in total). If a run fails, rerun the same
`run.js` command: finished runs are skipped. Do not open `evals/harness/runs/p3-r1/key.json`
until all rankings are in.

## 2. Rank (about 3 to 5 minutes per pair)

For each folder in `evals/harness/runs/p3-r1/bundles/`:

1. Open `form.html` in a browser.
2. Look at both outputs: the screenshots, and "Open output A/B" for the live page (resize the
   window, tab through it).
3. For each of the ten dimensions and Overall, pick A, B, or tie, using the anchors in
   `evals/rubric.md`. Choose tie when you cannot judge.
4. Click "Download answers (JSON)" and keep the file.

Ideally use two or more raters; each rater ranks every pair independently. Put all returned
JSON files into one folder, for example `~/p3-rankings/`.

## 3. Aggregate

```sh
node evals/harness/aggregate.js --run-id p3-r1 --rankings ~/p3-rankings
```

Read `evals/harness/results/p3-r1/summary.md`. The gate is met when the skill arm's overall
win rate is at least 65% over N >= 30 pairs (ties count half), and the automated gates are
met. Report back in the project thread with the summary file.
