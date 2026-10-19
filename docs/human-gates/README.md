# Human gates

Steps the spec reserves for a person. Claude builds everything up to the human step and never
fills in a human result. Status as of 2026-10-18.

| Gate | Phase | Status | What it needs from you | Instructions |
|---|---|---|---|---|
| Apply the skill to 3 real projects | P1 | **waived** by the user for lack of time on 2026-10-14; not run | nothing now; run it later if you want the evidence | [p1-real-projects.md](p1-real-projects.md) |
| Blind pairwise ranking, N ≥ 30 pairs, win rate ≥ 65 % | P3 | **pending your ranking**: the 36 pairs are generated and bundled (run `p3-r1`). The automated gates for that run: axe met, Slop Lint met, build met, honesty **not met** (258/313); see [p3-r1-automated.md](../evals/p3-r1-automated.md) | rank the 36 bundles blind, then run the aggregate command | [p3-blind-ranking.md](p3-blind-ranking.md) |
| V3 behavior check per agent | P6 | **pending** for every agent. V2, an automated check, now passes for 6 agents: Claude Code, Codex, Copilot, Gemini CLI, opencode, and Kilo Code. Each other agent's blocker is recorded in [compatibility.md](../compatibility.md) | run `evals/agent-smoke/` in each agent you use, record the result in `adapters/verification.json`, then run `node scripts/generate-agent-docs.js`. An agent is labelled Supported only after this | [../../evals/agent-smoke/README.md](../../evals/agent-smoke/README.md) |
| Publish to npm | P1b | **name decided, publish pending**: the package is `@santheesh73/frontend-craft` (2026-10-15: `npm view frontend-craft version` returned 2.4.0, an unrelated owner; `npm view @santheesh73/frontend-craft version` returned 404, so the scoped name was free). Re-checked 2026-10-19: still 2.4.0 and 404. Not published; the decision to publish remains yours | run `npm run package`, then `cd dist/frontend-craft && npm publish --access public` yourself (logged in to npm as `santheesh73`). Never run a bare `npx frontend-craft`: it fetches the unrelated package | [../installation.md](../installation.md) |
| Release `v1.0.0` (tag and GitHub release) | P6 | **pending** your decision | decide whether to tag 1.0 with the P3 ranking still pending, or wait for it | [../release-notes/v1.0.0.md](../release-notes/v1.0.0.md) |

The P4 precision check and the P5 conformance runs (now also on MUI and shadcn/ui, Chromium only) are automatic gates; their results are
judged or run by Claude and say so in `docs/evals/`.
