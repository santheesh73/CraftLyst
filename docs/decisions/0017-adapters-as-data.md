# ADR-0017: Agent adapters are data, not code

- Status: accepted
- Date: 2026-10-15

## Context

Frontend Craft should install for many coding agents (Claude Code, Codex CLI, Gemini CLI,
GitHub Copilot, Cursor, Windsurf, Cline, Roo Code, Aider, and others). Each agent reads
instructions from a different place, and those places change. Per-agent installer code
would multiply bugs and make each new agent a code review.

## Decision

- One JSON file per agent at `adapters/<agent-id>/adapter.json`, validated by
  `adapters/adapter-schema.json`: id, label, aliases, `docsUrl`, `docsVerifiedOn`,
  `kind` (`skill`, `block`, or `file`), project and user paths, rule-file frontmatter,
  detection markers, native skill support, notes, caveats.
- The installer (`installer/engine.js`) knows only the three kinds. `install`, `uninstall`,
  `update`, `list`, `verify`, the `--agent auto` detection, and the agent table in
  `docs/compatibility.md` all read the adapter files.
- An adapter may set `docsVerifiedOn` only together with a `docsUrl` that was read on that
  date. Facts that could not be checked against official docs stay out of the adapter; the
  agent is listed as "Researched, not supported" instead.
- Adding an agent means one adapter file, one test row, and one docs row.

## Consequences

- Paths are relative and validated to stay inside the project or home directory, so an
  adapter cannot direct writes elsewhere.
- Behavior differences between agents that the three kinds cannot express (for example
  Aider needing a `read:` entry in its config) are documented as caveats, not coded.
