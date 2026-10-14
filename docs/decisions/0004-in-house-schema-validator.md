# ADR-0004: In-house JSON Schema subset validator

- Status: accepted
- Date: 2026-10-14

## Context

The CLI validates `tokens.json`, `craft.config.json`, reports, recipes, and catalog
entries at runtime. Ajv is the usual choice, but the runtime dependency budget is
reserved for parsers (ADR-0003).

## Decision

Implement `cli/src/schema.js`, a validator for the JSON Schema subset our schemas use:
`type`, `properties`, `required`, `additionalProperties` (boolean or schema),
`patternProperties`, `items`, `enum`, `const`, `pattern`, `minLength`, `maxLength`,
`minimum`, `maximum`, `minItems`, `maxItems`, `uniqueItems`, `oneOf`, `anyOf`, `allOf`,
`$ref` to local `#/$defs/...`, and `format` for `date`, `date-time`, `uri`. Schemas
declare draft 2020-12. A unit test fails if any of our schemas uses a keyword the
validator does not implement, so the subset cannot silently drift.

## Consequences

Zero dependencies for validation. Error messages are ours to make actionable (path,
expected, actual). Third parties can still validate our files with any 2020-12 validator.
