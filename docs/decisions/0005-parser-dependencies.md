# ADR-0005: Runtime parser dependencies

- Status: accepted (2026-10-14, at the start of P2)
- Date: 2026-10-14

## Context

Slop Lint must read CSS, HTML, and JSX/TSX reliably. Regex parsing produces false
positives, which the P2 gate measures (< 15 %). The spec allows at most 5 pinned runtime
dependencies, for CSS and HTML/JSX parsing only.

## Decision

Three direct runtime dependencies, pinned exactly:

| Package | Version | License | Purpose |
|---|---|---|---|
| `postcss` | 8.5.28 | MIT | CSS AST with source positions (CSS files, `<style>` blocks) |
| `parse5` | 8.0.1 | MIT | spec-compliant HTML parsing with source locations |
| `@babel/parser` | 7.29.8 | MIT | JS/TS/JSX parsing with locations |

Versions were chosen at least two weeks older than the build date. Licenses were read from
each installed `package.json` (2026-10-14).

Transitive packages that ship with the skill (all on the license allowlist):

| Package | Version | License | Pulled in by |
|---|---|---|---|
| `nanoid` | 3.3.20 | MIT | postcss |
| `picocolors` | 1.1.1 | ISC | postcss |
| `source-map-js` | 1.2.2 | BSD-3-Clause | postcss |
| `entities` | 8.1.0 | BSD-2-Clause | parse5 |

`@babel/parser` declares `@babel/types` as a dependency, but its compiled bundle has no
runtime `require` of it (checked with `grep require node_modules/@babel/parser/lib/index.js`
on 2026-10-14), so the packaged skill does not include `@babel/types` and its helpers.
A package test fails if the packaged CLI cannot parse JSX without them.

`entities` 8 requires Node ≥ 20.19, so `engines.node` is raised to `>=20.19`.

Rejected: `htmlparser2` (4 dependencies), `css-tree` (1.3 MB plus `mdn-data`),
`postcss-value-parser` (value scanning is small enough to do in-house), Babel 8 (larger
runtime dependency on `@babel/types`).

## Consequences

- "≤ 5 runtime dependencies" is read as direct dependencies: 3 direct, 7 packages shipped
  in total. This interpretation is stated in the README so users can judge it.
- Vue, Svelte, and Astro files are handled by extracting `<style>` blocks and markup
  without framework compilers.
