# Agent smoke test (V3, human gate)

V3 checks that an agent actually behaves the way Frontend Craft asks once it is installed.
Only a person running the agent can record it. An agent is listed as **Supported** in
`docs/compatibility.md` only after a V3 pass is recorded here with the agent's version and date.

## Run it, per agent (about 10 minutes)

From a clone of this repository, after `npm ci`:

```sh
node evals/agent-smoke/smoke.js prepare --agent <agent-id>
```

`<agent-id>` is one of the ids from `node install.mjs list` (for example `claude-code`, `codex`,
`copilot`, `cursor`, `gemini`). It copies `project/` to a new folder outside this repository,
builds the package if needed, installs the skill for that agent, and prints the task.

1. Start the agent in the folder it printed, in a fresh session, and paste the task exactly.
2. When it finishes, save the transcript to a file if the agent can export one (optional).
3. Run the check it printed:

       node evals/agent-smoke/smoke.js check --agent <agent-id> --dir <folder> --transcript <file> --agent-version <version> --record

   It shows what it can see for each behavior below (from the files, and from the transcript
   when given), then asks you to confirm each one. Press Enter to accept what it saw, or answer
   y/n. With `--record` it writes your verdict as the agent's `v3` entry in
   `adapters/verification.json` and regenerates `docs/compatibility.md`; commit both. Nothing
   is recorded without your answers, and nothing at all outside an interactive terminal.

The manual way still works: copy `project/` to an empty folder, run
`node <frontend-craft>/install.mjs install --agent <agent-id> --target <folder>`, give the
agent [task.md](task.md), check the behaviors below by hand, and add a row to a copy of
[results-template.md](results-template.md).

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
