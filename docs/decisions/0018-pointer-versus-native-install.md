# ADR-0018: Native skill install versus pointer install

- Status: accepted
- Date: 2026-10-15

## Context

Claude Code loads Agent Skills (`SKILL.md` folders) natively, with progressive disclosure:
only the description is in context until the skill is used. Most other agents read one or
more instruction files instead. Copying the whole skill into every agent's rules would
waste context and duplicate the package many times.

## Decision

- `skill` kind: when an agent's official docs describe native `SKILL.md` skills, copy the
  whole package into that agent's skills directory.
- `block` and `file` kinds: install one shared package copy at `.frontend-craft/` (or
  `~/.frontend-craft/` for user scope) and a short pointer: a managed block between
  `<!-- frontend-craft:begin -->` and `<!-- frontend-craft:end -->` in a shared file
  (`AGENTS.md`, `GEMINI.md`, Copilot instructions, `CONVENTIONS.md`), or a whole rule file
  marked `frontend-craft:managed`. The pointer says when to use the skill, where `SKILL.md`
  and the CLI are, and "do not claim a check, render, or test you did not run".
- `SKILL.md` keeps the `<skill-dir>` convention so it works both ways; the pointer maps
  `<skill-dir>` to the package copy.
- Agents sharing one file (for example several agents reading `AGENTS.md`) share one block;
  the install state records which agents use it, and the block goes away with the last one.

## Consequences

- Shared files are restored byte for byte on uninstall (the separator added before the
  block is recorded); CRLF files keep CRLF.
- Files and directories without the installer's marker are never overwritten without
  `--force`; the installer reports a conflict and exits 1.
- The shared package copy is removed only when no pointer references it.
