# Cursor adapter

**Status: untested.** The installer and the rule file are tested (`scripts/test/install-agent.test.js`).
No live Cursor session has run with this skill, so Cursor is not listed as supported.

## Install

    node scripts/install-agent.js --agent cursor --project ./my-app --dry-run
    node scripts/install-agent.js --agent cursor --project ./my-app

This copies the skill to `./my-app/.frontend-craft/` and writes
`./my-app/.cursor/rules/frontend-craft.mdc`, a project rule with a `description`, empty
`globs`, and `alwaysApply: false`, so the agent loads it when a request matches the description.
The rule format follows our understanding of Cursor project rules; it was not checked against
current Cursor documentation from this build environment (the docs host was not reachable).

## Check it yourself

1. Open the project in Cursor and ask the agent for a frontend task.
2. It should load the Frontend Craft rule, read `.frontend-craft/SKILL.md`, and run
   `node .frontend-craft/cli/bin/craft.js lint`.
3. If the rule does not load, set `alwaysApply: true` in the `.mdc` file and report it.

## Uninstall

Delete `.frontend-craft/` and `.cursor/rules/frontend-craft.mdc`.
