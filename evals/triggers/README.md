# Skill trigger tests

`prompts.json` holds 50 prompts: 25 that should trigger `frontend-craft` and 25 that
should not, including near misses (backend, copywriting, Figma questions, native mobile,
build tooling, state bugs). `run.js` runs each prompt through headless Claude Code and
records whether the `Skill` tool was invoked with `frontend-craft` (ADR-0010).

```sh
npm run package
node evals/triggers/run.js --concurrency 4 --label "my change"
```

How it isolates runs: the packaged skill is installed into a fresh temporary project;
`--setting-sources project`; the parent session's memory variables are unset and auto
memory is disabled; file-changing and network tools are disallowed; at most 2 turns.

What a result means: whether the agent chose the skill on its own for that prompt, with
the Claude Code version and model recorded. Other installed skills compete for selection,
as they would for a real user, so results depend on the environment. Runs cost tokens and
are not part of CI. Results live in `results/` (`latest.json` plus one file per run).
