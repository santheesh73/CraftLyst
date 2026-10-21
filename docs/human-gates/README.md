# Human gates

Steps the spec reserves for a person. Claude builds everything up to the human step and never
fills in a human result. Status as of 2026-10-21.

## Quickest path to real-user proof

Three things only a person can do, each set up to need as little of your time as possible:

1. **Blind ranking** (2 to 3 hours, can be split over days): unzip `p3-r1-bundles.zip`, run
   `node evals/harness/rank.js --bundles ~/p3/bundles --rater <initials>`, and click through the
   36 pairs in your browser; answers save themselves. Then unpack the PRIVATE archive and run
   the aggregate command. Steps: [p3-blind-ranking.md](p3-blind-ranking.md).
2. **V3 check in the agent you use** (about 10 minutes per agent):
   `node evals/agent-smoke/smoke.js prepare --agent <id>`, paste the printed task into the
   agent, then run the printed `check ... --record` command and answer five yes/no questions.
   Steps: [../../evals/agent-smoke/README.md](../../evals/agent-smoke/README.md).
3. **2 or 3 outside testers** (about 15 minutes of yours): `node scripts/tester-kit.js`, send
   `dist/tester-kit/` to each tester, and post the returned forms. Steps:
   [outside-testers.md](outside-testers.md).

## All gates

| Gate | Phase | Status | What it needs from you | Instructions |
|---|---|---|---|---|
| Apply the skill to 3 real projects | P1 | **waived** by the user for lack of time on 2026-10-14; not run | nothing now; run it later if you want the evidence | [p1-real-projects.md](p1-real-projects.md) |
| Blind pairwise ranking, N ≥ 30 pairs, win rate ≥ 65 % | P3 | **pending your ranking**: the 36 pairs are generated and bundled (run `p3-r1`). The automated gates for that run: axe met, Slop Lint met, build met, honesty **not met** (258/313); see [p3-r1-automated.md](../evals/p3-r1-automated.md) | rank the 36 bundles blind in the local ranking app (`evals/harness/rank.js`), then run the aggregate command | [p3-blind-ranking.md](p3-blind-ranking.md) |
| V3 behavior check per agent | P6 | **pending** for every agent. V2, an automated check, now passes for 6 agents: Claude Code, Codex, Copilot, Gemini CLI, opencode, and Kilo Code. Each other agent's blocker is recorded in [compatibility.md](../compatibility.md) | run `evals/agent-smoke/smoke.js prepare` and `check --record` in each agent you use (it records your answers in `adapters/verification.json` and regenerates the docs). An agent is labelled Supported only after this | [../../evals/agent-smoke/README.md](../../evals/agent-smoke/README.md) |
| Outside testers on their own projects (2 or 3) | real-user proof | **pending**: kit added 2026-10-21 | send the tester kit, collect the feedback forms | [outside-testers.md](outside-testers.md) |
| Publish to npm | P1b | **name decided, publish pending**: the package is `@santheesh73/frontend-craft` (2026-10-15: `npm view frontend-craft version` returned 2.4.0, an unrelated owner; `npm view @santheesh73/frontend-craft version` returned 404, so the scoped name was free). Re-checked 2026-10-19: still 2.4.0 and 404. Not published; the decision to publish remains yours | run `npm run package`, then `cd dist/frontend-craft && npm publish --access public` yourself (logged in to npm as `santheesh73`). Never run a bare `npx frontend-craft`: it fetches the unrelated package | [../installation.md](../installation.md) |
| Release `v1.0.0` (tag and GitHub release) | P6 | **pending** your decision | decide whether to tag 1.0 with the P3 ranking still pending, or wait for it | [../release-notes/v1.0.0.md](../release-notes/v1.0.0.md) |

The P4 precision check and the P5 conformance runs (now also on MUI and shadcn/ui, Chromium only) are automatic gates; their results are
judged or run by Claude and say so in `docs/evals/`.
