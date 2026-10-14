# P1 human gate: three real projects

The P1 gate asks a person to apply the skill to **3 real projects** and confirm that the
design contract persists and is reused across sessions. Claude cannot do this step for you.

## Per project (about 20 minutes)

1. Install into the project:
   `node scripts/install-claude-code.js --project <path-to-project>` (from the repo after `npm run package`).
2. **Session 1**: in Claude Code, ask for a size M task (a new page or component).
   - [ ] The skill triggered (Claude mentions Frontend Craft or reads its references).
   - [ ] `.craft/DESIGN.md`, `tokens.json`, `decisions.md` were created or extracted, with placeholders filled.
   - [ ] For a project with an existing design system: it was described, not replaced.
   - [ ] The final answer started with the highest proof tier and listed only checks that ran.
3. **Session 2** (start a fresh session): ask for a different task in the same area.
   - [ ] Claude read `.craft/DESIGN.md` before editing, without being told.
   - [ ] The new UI used the same tokens and direction; no new hardcoded values.
   - [ ] Any change of direction was logged in `decisions.md`.
4. Note anything that felt generic, wrong, or slow.

## Report back

Reply in the project thread with, per project: stack, task sizes, the checkboxes above,
and notes. Good projects to pick: one with no design system, one with an existing
system (Tailwind theme or component library), and one that is not React (plain HTML, Vue,
Svelte, or Astro).
