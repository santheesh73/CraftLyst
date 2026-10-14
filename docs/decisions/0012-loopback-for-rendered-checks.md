# ADR-0012: Loopback connections for rendered checks

- Status: accepted
- Date: 2026-10-14

## Context

ADR-0007 forbids network access unless `--allow-network` is passed. Tier 2 checks drive
a browser against the user's dev server, which means a socket to localhost.

## Decision

- `craft shoot --file <html>` renders local files over `file://` and opens no sockets of its own.
- `craft shoot --url` accepts loopback URLs (`localhost`, `127.0.0.1`, `[::1]`) without
  `--allow-network`. Any other host requires `--allow-network`.
- The browser is launched with a request filter that aborts every non-loopback,
  non-file request unless `--allow-network` is passed, so a page cannot pull remote
  resources behind the user's back. Aborted requests are listed in the report.
- The no-network CI test covers every command except `shoot`, and `shoot --file` with
  the request filter.

## Consequences

Pages that depend on remote fonts or APIs render differently without `--allow-network`;
the report says which requests were blocked.
