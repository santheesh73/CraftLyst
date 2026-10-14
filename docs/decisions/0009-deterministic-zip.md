# ADR-0009: Deterministic zip packaging

- Status: accepted
- Date: 2026-10-14

## Context

Releases ship a zip and `SHA256SUMS`. Checksums only mean something if the build is
reproducible from a clean checkout. The system `zip` tool embeds timestamps and is not
present everywhere.

## Decision

`scripts/lib/zip.js` writes a zip with `node:zlib` (deflate-raw) and a CRC-32 computed
in-house: files sorted by path, fixed timestamp (1980-01-01), fixed permissions, no
extra fields. `SHA256SUMS` covers the zip and every file in `dist/frontend-craft/`.

## Consequences

Two builds from the same commit produce byte-identical archives (tested). The archive
extracts with standard `unzip` (tested in CI).
