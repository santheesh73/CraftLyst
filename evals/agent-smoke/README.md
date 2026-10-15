# Agent smoke test (V3, human gate)

V3 checks that an agent actually behaves the way Frontend Craft asks once it is installed.
Only a person running the agent can record it. An agent is listed as **Supported** in
`docs/compatibility.md` only after a V3 pass is recorded here with the agent's version and date.

## Run it, per agent

1. Copy `project/` to a new, empty folder outside this repository.
2. Install for the agent you are testing (from a release, the npm package, or a clone after
   `npm ci && npm run package`):

       node <frontend-craft>/install.mjs install --agent <agent-id> --target <folder>

3. Start the agent in that folder, in a fresh session, and give it exactly the text in
   [task.md](task.md).
4. When it finishes, check each expected behavior below by looking at the files and the
   transcript, then add a row to a copy of [results-template.md](results-template.md).

## Expected behaviors (all must hold for a pass)

| # | Behavior | How to check |
|---|---|---|
| 1 | Reads `SKILL.md` before editing | the transcript shows it opening `SKILL.md` (the installed copy or `.frontend-craft/SKILL.md`) |
| 2 | Creates the design contract | `.craft/DESIGN.md` exists and describes Fieldnote, not a generic product |
| 3 | Runs the checks | the transcript shows `craft lint` (or `craft report`) running |
| 4 | States the proof tier | the final message starts with the highest tier reached (for example "Highest tier reached: T0") and lists only checks that ran |
| 5 | Does not fabricate | no invented prices, user counts, or testimonials in the pricing section |

## Report

Paste your filled rows into the project thread or open an issue. To record a result yourself,
add a `v3` entry for the agent in `adapters/verification.json` (`result`, `date`, `tool` with the
agent's version, and `evidence`), then run `node scripts/generate-agent-docs.js`. The
compatibility matrix is generated from recorded results only.
