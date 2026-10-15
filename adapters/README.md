# Agent adapters

| Adapter | Install | Status |
|---|---|---|
| [`claude-code/`](claude-code/README.md) | `node scripts/install-claude-code.js --user` or `--project <dir>` | supported (verified install and headless trigger runs) |
| [`codex/`](codex/README.md) | `node scripts/install-agent.js --agent codex --project <dir>` | untested |
| [`cursor/`](cursor/README.md) | `node scripts/install-agent.js --agent cursor --project <dir>` | untested |
| [`other-agents/`](other-agents/README.md) | `node scripts/install-agent.js --agent generic --project <dir>` | untested |

An agent is listed as supported only after a verified install and behavior check in that agent.
"Untested" means the installer works (unit tests) but no live session of that agent has used the skill.
