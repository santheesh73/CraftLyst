# Human gates

Steps the spec reserves for a person. Claude builds everything up to the human step and never
fills in a human result. Status as of 2026-10-15.

| Gate | Phase | Status | What it needs from you | Instructions |
|---|---|---|---|---|
| Apply the skill to 3 real projects | P1 | **waived** by the user for lack of time on 2026-10-14; not run | nothing now; run it later if you want the evidence | [p1-real-projects.md](p1-real-projects.md) |
| Blind pairwise ranking, N ≥ 30 pairs, win rate ≥ 65 % | P3 | **pending** | generate the pairs, rank them blind, run the aggregate script | [p3-blind-ranking.md](p3-blind-ranking.md) |
| V3 behavior check per agent | P6 | **pending** for every agent | run `evals/agent-smoke/` in each agent you use, record the result in `adapters/verification.json`, then run `node scripts/generate-agent-docs.js`. An agent is labelled Supported only after this | [../../evals/agent-smoke/README.md](../../evals/agent-smoke/README.md) |
| Publish `frontend-craft` to npm | P1b | **pending** your decision; not published | pick a package name first: `frontend-craft` is already taken on npm by another owner (`npm view frontend-craft` showed version 2.4.0 on 2026-10-15), so a scoped name such as `@santheesh73/frontend-craft` is likely needed. Then run `npm publish` from `dist/frontend-craft/` yourself. Until then, do not run a bare `npx frontend-craft`: it would fetch that other package | [../installation.md](../installation.md) |
| Release `v1.0.0` (tag and GitHub release) | P6 | **pending** your decision | decide whether to tag 1.0 with the P3 ranking still pending, or wait for it | [../release-notes/v1.0.0.md](../release-notes/v1.0.0.md) |

The P4 precision check and the P5 conformance runs are automatic gates; their results are
judged or run by Claude and say so in `docs/evals/`.
