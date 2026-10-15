# Codex adapter

**Status: untested.** The installer and the pointer text are tested (`scripts/test/install-agent.test.js`).
No live Codex session has run with this skill, so Codex is not listed as supported.

## Install

From the repository after `npm run package`, or from an extracted release zip:

    node scripts/install-agent.js --agent codex --project ./my-app --dry-run
    node scripts/install-agent.js --agent codex --project ./my-app

This copies the skill to `./my-app/.frontend-craft/` and adds a block between
`<!-- frontend-craft:begin ... -->` and `<!-- frontend-craft:end -->` to `./my-app/AGENTS.md`
(the file is created if missing; text outside the markers is never changed). The block tells
the agent when the skill applies, to read `.frontend-craft/SKILL.md` first, and how to run the CLI.

## Check it yourself

1. Start Codex in the project and ask for a frontend task, such as a new settings page.
2. It should read `.frontend-craft/SKILL.md`, create or read `.craft/`, run
   `node .frontend-craft/cli/bin/craft.js lint`, and state the highest proof tier in its answer.
3. Open an issue with what happened, so the status here can change from untested.

## Uninstall

Delete `.frontend-craft/` and the marked block in `AGENTS.md`.
