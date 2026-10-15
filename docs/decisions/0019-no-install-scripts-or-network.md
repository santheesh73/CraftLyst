# ADR-0019: No install scripts and no network in the installer

- Status: accepted
- Date: 2026-10-15

## Context

Installers are a common supply-chain attack surface: lifecycle scripts run on
`npm install`, and installers that download code at install time run whatever the server
returns. ADR-0007 already keeps the CLI offline by default.

## Decision

- The installer reads the package it ships in and writes only the adapter-declared paths,
  the shared package copy, and install markers, all inside the target (project) or home
  directory. It imports no network modules and uses no `eval` or `new Function`; the
  repository lint and a test enforce both.
- The npm package has no `scripts` field, so no `preinstall`, `install`, or `postinstall`
  hook runs. Runtime parsers are vendored in the package's `node_modules/` and declared as
  `bundleDependencies`, so `npm pack` ships them and installing the tarball needs no further
  downloads for the CLI to work.
- `verify` is the only installer command that starts a process: the installed CLI, with the
  current Node binary, to prove it runs.
- Publishing to npm is a human step; the build stops at `npm pack`.

## Consequences

- `npx --package @santheesh73/frontend-craft frontend-craft install` downloads the package itself (that is npm's job); nothing
  else is fetched.
- Updates are explicit (`update`), never automatic.
