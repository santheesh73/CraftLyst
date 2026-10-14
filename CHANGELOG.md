# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Schemas carry their own
`schemaVersion`, versioned separately from the skill.

## [Unreleased]

### Added

- Build plan (`PLAN.md`) and ADRs 0001–0011.
- JSON schemas (draft 2020-12 subset) for tokens, config, reports, recipes, and catalog entries, with valid and invalid examples.
- In-house schema validator (`cli/src/schema.js`) with unit tests.
- Dependency-free repository lint (`scripts/lint.js`).
- CI workflow: lint, type-check, tests, and schema validation on Node 20 and 22.
