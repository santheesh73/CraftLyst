# ADR-0010: Trigger tests against headless Claude Code

- Status: accepted
- Date: 2026-10-14

## Context

The skill only helps if it triggers on frontend work and stays quiet otherwise.
Simulating selection with a prompt to a model is not the real mechanism.

## Decision

`evals/triggers/run.js` installs the built package into a temporary project's
`.claude/skills/`, runs `claude -p <prompt>` with `--output-format stream-json`,
and records whether the `Skill` tool was invoked with `frontend-craft`. Tools that
change files are disallowed, and turns are capped. Results (per prompt, plus accuracy)
are written to `evals/triggers/results/` with the Claude Code version and date.
The runner exits 3 when the `claude` CLI is unavailable and never writes fake results.

## Consequences

Results depend on the Claude Code version and model serving the run; both are recorded.
Runs cost tokens, so they are manual, not part of CI.
