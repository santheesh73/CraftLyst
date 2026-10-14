# Installation

Frontend Craft has two parts: the **skill** (instructions an agent loads) and the
**`craft` CLI** (checks the agent runs). Both ship in one package.

## Requirements

- Node 20 or newer for the CLI and the installer.
- Claude Code for the skill (other agents: see `docs/compatibility.md`).

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

## Install for Claude Code

From the repository after `npm run package`, or from an extracted release zip:

```sh
node scripts/install-claude-code.js --user --dry-run     # preview
node scripts/install-claude-code.js --user               # ~/.claude/skills/frontend-craft
node scripts/install-claude-code.js --project ./my-app   # ./my-app/.claude/skills/frontend-craft
```

`scripts/install-claude-code` is a shell wrapper for the same script. The installer copies
files only, never overwrites an existing install without `--force`, and makes no network
calls.

Verify:

```sh
node ~/.claude/skills/frontend-craft/cli/bin/craft.js --version
```

## Uninstall

Delete the `frontend-craft` directory from `~/.claude/skills/` or `<project>/.claude/skills/`.
Project contracts in `.craft/` are yours and are not touched.
