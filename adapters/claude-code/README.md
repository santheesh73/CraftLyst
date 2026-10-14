# Claude Code adapter

## Install the skill

    node scripts/install-claude-code.js --user              # ~/.claude/skills/frontend-craft
    node scripts/install-claude-code.js --project <dir>     # <dir>/.claude/skills/frontend-craft

## Optional: the proof Stop hook

`hooks/stop-proof.js` is a Claude Code `Stop` hook. It is **off unless you add it** to a
settings file. Print the entry to add:

    node scripts/install-claude-code.js --project <dir> --print-stop-hook
    node scripts/install-claude-code.js --user --print-stop-hook

What it does when Claude is about to stop:

| Situation | Result |
|---|---|
| No `.craft/` contract in the project | Allows the stop |
| `stop_hook_active` is true (Claude is already continuing because of a Stop hook) | Allows the stop, so it can never loop |
| Proof report missing (and the project has frontend sources), stale, or invalid | Blocks once, asking Claude to run `craft report` and state each check with its label |
| Fresh report with blocking findings or failed checks | Blocks once, asking Claude to fix them, add a reasoned `craft-allow`, or tell you what still fails |
| Fresh, clean report | Allows the stop |
| Any internal error | Allows the stop and prints the error to stderr |

The hook reads files only (it compares the report's content hash with the current files);
it never runs project scripts, a browser, or the network. Input and output follow the
Stop event in the Claude Code hooks reference: it reads `cwd` and `stop_hook_active` from
stdin and prints `{"decision": "block", "reason": "..."}` to block.

Verified here: the decision logic by unit tests (`cli/test/stop-hook.test.js`) and the
stdin/stdout contract by running the script with sample input. Not verified: a live
Claude Code session running the hook end to end.
