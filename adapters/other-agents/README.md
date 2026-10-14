# Other agents

**Status: untested.** Any agent that reads project instructions from a file can use the skill.

    node scripts/install-agent.js --agent generic --project ./my-app

This copies the skill to `./my-app/.frontend-craft/` and adds the same marked block as the
Codex adapter to `./my-app/AGENTS.md`. If your agent reads a different file (for example its
own rules or memory file), copy the block there instead.

What the agent needs to do, whatever the tool:

1. Read `.frontend-craft/SKILL.md` before frontend work and the references it points to.
2. Run the CLI with Node 20 or newer: `node .frontend-craft/cli/bin/craft.js <command>`.
3. Keep the design contract in `.craft/` and state the highest proof tier in its final answer.

Agents that support the Agent Skills folder format directly can instead copy
`dist/frontend-craft/` into their skills directory; check that agent's documentation for the path.
