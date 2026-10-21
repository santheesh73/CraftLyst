# Try Frontend Craft on your own project (about 40 minutes)

Thank you for testing. Frontend Craft is a skill for AI coding agents (Claude Code, Codex,
Copilot, Cursor, Gemini CLI, and others) that makes frontend work follow your project's design
system and report only checks that actually ran. We want to know whether it helps on a real
codebase, so please be blunt. "It made things worse" is a useful answer.

You need: a frontend project you know (any framework), the coding agent you normally use,
Node 20 or newer, and git.

## 1. Pick one real task (2 minutes)

Pick a UI task you would do anyway, sized like "add a settings section", "build the empty
state for the orders table", or "add a pricing card". Not a one-line tweak, not a redesign.
Write the prompt down once; you will give the agent exactly the same text twice.

## 2. Run it twice, once with the skill and once without (30 minutes)

Flip a coin to decide which run goes first, so the order does not favor either.

**Without the skill**

```sh
git switch -c try-without-skill
# start your agent in a fresh session, paste the prompt, let it finish
git add -A && git commit -m "without skill"
git switch -    # back to where you started
```

**With the skill**

```sh
git switch -c try-with-skill
unzip frontend-craft-*.zip -d ~/frontend-craft      # once; check SHA256SUMS if you like
node ~/frontend-craft/frontend-craft/install.mjs install --agent auto --target .
# start your agent in a fresh session, paste the same prompt, let it finish
git add -A && git commit -m "with skill"
```

`--agent auto` installs for the agents it detects in the project. To pick one, use its id,
for example `--agent claude-code`, `--agent codex`, or `--agent cursor`
(`node ~/frontend-craft/frontend-craft/install.mjs list` shows them all). The install only
adds files; remove them later with the same command and `uninstall` instead of `install`.

If your agent does not pick up the skill, tell us; that is a finding too.

## 3. Compare (5 minutes)

Run both branches and look at the result in the browser, on a phone width as well as a
desktop width, and in dark mode if your app has one. Read both diffs. If a colleague can
judge the two branches without being told which is which, even better: give them the two
branch names in random order.

## 4. Send the feedback

Fill in [FEEDBACK.md](FEEDBACK.md) and send it back. Do not send code or screenshots from a
private project unless you want to; the answers alone are enough.
