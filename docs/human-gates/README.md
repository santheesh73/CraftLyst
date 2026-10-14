# Human gates

Steps the spec reserves for a person. Claude builds everything up to the human step and never
fills in a human result. Status as of 2026-10-14.

| Gate | Phase | Status | What it needs from you | Instructions |
|---|---|---|---|---|
| Apply the skill to 3 real projects | P1 | **waived** by the user for lack of time on 2026-10-14; not run | nothing now; run it later if you want the evidence | [p1-real-projects.md](p1-real-projects.md) |
| Blind pairwise ranking, N ≥ 30 pairs, win rate ≥ 65 % | P3 | **pending** | generate the pairs, rank them blind, run the aggregate script | [p3-blind-ranking.md](p3-blind-ranking.md) |
| Release `v1.0.0` (tag and GitHub release) | P6 | **pending** your decision | decide whether to tag 1.0 with the P3 ranking still pending, or wait for it | [../release-notes/v1.0.0.md](../release-notes/v1.0.0.md) |

The P4 precision check and the P5 conformance runs are automatic gates; their results are
judged or run by Claude and say so in `docs/evals/`.
