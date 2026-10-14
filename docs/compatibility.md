# Compatibility

## Agents

| Agent | Status | Evidence |
|---|---|---|
| Claude Code | supported (skill format) | installed into a clean project and triggered in headless runs; see `evals/triggers/results/` |
| Codex | untested | `scripts/install-agent.js --agent codex` is unit-tested; no live Codex session was run (no Codex CLI or API key in the build environment) |
| Cursor | untested | `scripts/install-agent.js --agent cursor` is unit-tested; no live Cursor session was run |
| Other agents | untested | `--agent generic` writes an `AGENTS.md` block; see `adapters/other-agents/` |

## Node

The CLI and scripts require Node 20 or newer. CI runs on Node 20 and 22.

## Project stacks

| Stack | v0.1 | v0.2 plan |
|---|---|---|
| any | contract validation, token contrast | |
| React, Next.js, Tailwind | | full static rules + rendered checks |
| Plain HTML and CSS | | full static rules + rendered checks |
| Vue, Svelte, Astro | | CSS-level static rules + rendered checks |
