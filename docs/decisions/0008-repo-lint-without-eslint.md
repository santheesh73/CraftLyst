# ADR-0008: Repository lint without ESLint

- Status: accepted
- Date: 2026-10-14

## Context

CI needs a lint step. ESLint plus plugins adds dozens of transitive dev dependencies.
`tsc --checkJs` with `strict` already catches most correctness issues.

## Decision

`scripts/lint.js` (no dependencies) enforces what matters for this project:
forbidden APIs (`eval`, `new Function`, `child_process` outside allowlisted files,
`http`/`https`/`net`/`dgram` imports outside allowlisted files), no trailing whitespace,
final newline, no tabs in JS, Markdown links that resolve, references one level deep
from `SKILL.md`, and a table of contents in references longer than 100 lines.

## Consequences

Style consistency relies on review. If the codebase grows past what this covers, a
new ADR can adopt ESLint.
