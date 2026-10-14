# Compatibility

## Agents

| Agent | Status | Evidence |
|---|---|---|
| Claude Code | supported (skill format) | installed into a clean project and triggered in headless runs; see `evals/triggers/results/` |
| Codex, Cursor, others | untested | adapters are planned for P6; nothing is claimed until a verified install |

## Node

The CLI and scripts require Node 20 or newer. CI runs on Node 20 and 22.

## Project stacks

| Stack | v0.1 | v0.2 plan |
|---|---|---|
| any | contract validation, token contrast | |
| React, Next.js, Tailwind | | full static rules + rendered checks |
| Plain HTML and CSS | | full static rules + rendered checks |
| Vue, Svelte, Astro | | CSS-level static rules + rendered checks |
