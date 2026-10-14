# ADR-0006: Repository layout and package boundary

- Status: accepted
- Date: 2026-10-14

## Context

The repository holds tests, fixtures, evals, and CI. Users install only the skill.

## Decision

- The repository root follows the layout in the kickoff spec (section 6).
- JSON schemas consumed by the CLI live in `cli/schemas/`; the catalog schema lives at `catalog/catalog-schema.json` as specified.
- `npm run package` builds `dist/frontend-craft/`: `SKILL.md`, `references/`, `templates/`, `tokens/recipes.json`, the CLI (`cli/bin`, `cli/src`, `cli/schemas`, its own `package.json`), `LICENSE`, `LICENSE-docs`, `NOTICE.md`. Tests, fixtures, evals, and docs are excluded.
- The package is tested from a clean temporary directory, never from the repo.

## Consequences

Paths used in `SKILL.md` are package-relative. A test checks every link in `SKILL.md`
and the references resolves inside the built package.
