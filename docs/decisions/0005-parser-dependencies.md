# ADR-0005: Runtime parser dependencies

- Status: proposed (to be accepted with pinned versions at the start of P2)
- Date: 2026-10-14

## Context

Slop Lint (P2) must read CSS, HTML, and JSX/TSX reliably. Regex parsing produces false
positives, which the P2 gate measures (< 15 %).

## Decision (proposed)

Budget of at most 5 runtime dependencies, all parsing:

| Need | Candidate | Why |
|---|---|---|
| CSS (and Tailwind `@apply`, custom properties) | `postcss` | de facto CSS AST, MIT, small dependency tree |
| CSS values (`var()`, colors, shadows) | `postcss-value-parser` | tokenizes declaration values, MIT, no dependencies |
| HTML | `parse5` or `htmlparser2` | spec-compliant HTML parsing with locations |
| JSX/TSX | `@babel/parser` | parses TS + JSX with locations, MIT |

Vue, Svelte, and Astro files are handled by extracting `<style>` and template blocks
without a framework compiler (CSS-level checks plus rendered checks), so no framework
parsers are added.

At P2 start: check each candidate's license on the npm registry, its install size and
transitive dependencies, pin exact versions, then mark this ADR accepted or revise it.

## Consequences

Not verified yet: licenses and sizes are checked at P2, not assumed here.
