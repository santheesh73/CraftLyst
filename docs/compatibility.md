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

| Stack | Static checks (Tier 0) | Rendered checks (Tier 2) |
|---|---|---|
| any | contract validation, token contrast, `tokens build`, catalog search | |
| React, Next.js, Tailwind | all static rules | `craft shoot` on a running dev server or built HTML |
| Plain HTML and CSS | all static rules | `craft shoot --file` |
| Vue, Svelte, Astro | CSS-level rules and template markup rules | `craft shoot` on a running dev server |

Component conformance (`contracts/conformance/run.js`) was run against Radix Primitives and
React Aria Components; see `docs/evals/conformance-results.md`.
