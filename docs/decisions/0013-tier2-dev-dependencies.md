# ADR-0013: Playwright and axe-core as dev dependencies for testing Tier 2

- Status: accepted
- Date: 2026-10-14

## Context

Tier 2 is optional for users: Playwright and axe-core are never runtime dependencies and
are installed in a user's project only after explicit approval. But this repository must
test the Tier 2 path, or CI cannot verify it.

## Decision

Add `playwright` (1.56.1) and `axe-core` (exact pin) as **dev** dependencies. CI installs
Chromium with `npx playwright install --with-deps chromium`. The CLI resolves Playwright
and axe-core from the user's project first, then from the CLI's own install location
(which only has them in this repository), and never installs anything itself. When they
are missing, `craft shoot` exits 3 with the exact pinned install command for the user to approve.

## Consequences

The packaged skill does not include Playwright or axe-core. Tests that need a browser
skip with a stated reason when Chromium is unavailable, and CI is configured so they run.
