# Contributing

Thank you for helping. This project values small, verified changes over large, untested ones.

## Ground rules

- **No receipt, no claim.** In PR descriptions, label each claim ✅ Verified (command + result), ⚠️ Not verified (reason), or ❌ Failed.
- **No fabrication.** Never invent URLs, licenses, statistics, testimonials, or attributions. Unverifiable facts get `verified_on: null` and `status: draft`.
- **No copying third-party work.** Catalog entries and references are independently written. Never paste code, copy, or assets from third-party sites or paid libraries.
- **Dependencies need an ADR** in `docs/decisions/`. The runtime budget is 5 pinned parser dependencies.

## Workflow

1. `npm ci`
2. Make the change with tests. Every lint rule needs positive and negative fixtures.
3. `npm run check`
4. Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).
5. Update `CHANGELOG.md` under "Unreleased".

## Writing a lint rule

A rule is a module in `cli/rules/` exporting `id`, `description`, default `severity`,
`confidence`, and a `check` function, plus fixtures in `cli/fixtures/rules/<id>/` and a
docs page. Static heuristics must report a confidence below 1 and say they are heuristics.

## Catalog entries

See `docs/catalog-contribution.md` (added in P4).
