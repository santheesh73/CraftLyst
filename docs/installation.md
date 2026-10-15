# Installation

Frontend Craft has two parts: the **skill** (instructions an agent loads) and the
**`craft` CLI** (checks the agent runs). Both ship in one package.

## Requirements

- Node 20 or newer for the CLI and the installer.
- A coding agent that loads skills or instruction files; see [compatibility.md](compatibility.md).

## Build the package from source

```sh
git clone https://github.com/santheesh73/CraftLyst.git
cd CraftLyst
npm ci
npm run package          # dist/frontend-craft/, dist/frontend-craft-<version>.zip, dist/SHA256SUMS
npm run verify-package   # checks every checksum and tests the zip
```

The build is reproducible on the same Node version: rebuilding the same commit produces
a byte-identical zip (tested in `scripts/test/package.test.js`). Different Node or zlib
versions may compress differently; compare `SHA256SUMS` lines for the extracted files, which
do not depend on compression.

## Install for your coding agents

One installer handles every agent. It reads `adapters/<agent-id>/adapter.json`; see
[compatibility.md](compatibility.md) for the agent list, where each installs, the official doc
each path comes from, and what has been verified.

Three ways to get the installer. None of them runs install scripts or uses the network.

```sh
# 1. From a clone after `npm run package`, or from an extracted release zip (check SHA256SUMS first)
node install.mjs install --agent auto

# 2. From the npm tarball (`npm pack` in dist/frontend-craft/). Not published to npm yet (a HUMAN
#    GATE). The name `frontend-craft` on npm belongs to a different package, so never run a bare
#    `npx frontend-craft`; point npx at the local tarball:
npx --package ./frontend-craft-<version>.tgz frontend-craft install --agent auto

# 3. The Claude Code wrapper (kept for existing users)
node scripts/install-claude-code.js --project ./my-app   # same as --agent claude-code
```

Common commands:

```sh
node install.mjs list                                     # agents, kinds, and paths
node install.mjs install --agent claude-code,cursor --dry-run   # preview, writes nothing
node install.mjs install --agent all --target ./my-app    # every agent
node install.mjs install --agent gemini --scope user      # ~/.agents/skills/frontend-craft
node install.mjs verify --target ./my-app                 # placement, file integrity, installed CLI runs
node install.mjs update --target ./my-app                 # repair or upgrade what is installed
node install.mjs uninstall --target ./my-app              # remove everything the installer placed
node install.mjs doctor --target ./my-app                 # Node, source package, detected agents
```

- `--agent auto` installs for agents whose files it finds in the project (for example `.cursor/`
  or `GEMINI.md`). With none found it installs for Claude Code and `AGENTS.md`.
- `--agent` accepts ids or aliases, comma-separated, in any case: `claude`, `copilot`, `devin`.
- Most agents read the open Agent Skills location `.agents/skills/`, so they share one copy.
  Claude Code (`.claude/skills/`) and Qwen Code (`.qwen/skills/`) get their own copies.
- Aider, Continue, and any `AGENTS.md` reader get a short pointer (a managed block in
  `CONVENTIONS.md` or `AGENTS.md`, or a rule file) to one shared copy in `.frontend-craft/`.
  Aider also needs `read: CONVENTIONS.md` in `.aider.conf.yml`; the installer does not edit YAML.
- `--scope user` installs only for agents that document a user-level location.

What the installer guarantees (each is a test in `scripts/test/installer*.test.js`):

- `--dry-run` writes nothing. A second install changes no bytes and reports `unchanged`.
- Shared files keep everything outside the `<!-- frontend-craft:begin -->` and
  `<!-- frontend-craft:end -->` markers byte for byte, including CRLF line endings.
- Files and directories it did not create are never overwritten without `--force` (exit 1).
- `uninstall` returns shared files to their original bytes, deletes files it created, and
  removes directories it created once they are empty.
- Exit codes: 0 ok, 1 conflicts or failed checks, 2 usage error, 3 environment problem.

Your project contracts in `.craft/` are yours: install, update, and uninstall never touch them.

## Verify

```sh
node install.mjs verify --target ./my-app
node ./my-app/.frontend-craft/cli/bin/craft.js --version   # or .claude/skills/frontend-craft/...
```

`verify` is the V1 placement check. It does not prove the agent loads or uses the skill; for
that, see the V2 and V3 columns in [compatibility.md](compatibility.md) and the smoke test in
[`evals/agent-smoke/`](../evals/agent-smoke/README.md).
