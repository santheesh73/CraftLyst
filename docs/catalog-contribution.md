# Contributing catalog entries

The catalog helps an agent pick a fitting pattern for an intent. An entry is a card, not
a code dump: it states what the pattern is for, what makes it work, where it fits on the
eight design axes, and where it breaks. Schema: `catalog/catalog-schema.json`. Index and
search design: [ADR-0014](decisions/0014-catalog-index-format.md).

## Add an entry

1. Pick an id (`kebab-case`, at most 64 characters) and create `catalog/entries/<id>.json`.
   For entries private to one project, use `.craft/catalog/<id>.json` in that project and
   run `craft index build` there.
2. Fill every required field. Write in your own words. Be concrete:
   - `characteristics`: 3-6 checkable properties ("sticky header and optional sticky
     first column"), not adjectives.
   - `axes`: only the axes where the pattern has a real preference, using positions from
     `tokens/recipes.json`. Leave an axis out when the pattern works anywhere on it.
   - `interaction`, `responsive`, `accessibility`: behavior, breakpoints, semantics, and
     the WCAG criteria that matter.
   - `limitations`: when not to use it. Every pattern has some.
3. Set provenance honestly (see below), then run:

   ```bash
   node cli/bin/craft.js catalog validate
   node scripts/build-index.js
   node scripts/generate-notice.js
   npm run catalog
   ```

4. Try two or three searches an agent would make for this entry and check it ranks.

## Source strategy

Prefer, in this order:

1. First-party open-source implementations with compatible licenses (`first-party-oss`).
2. Official documentation and examples whose terms permit the use (`official-docs`).
3. Independently authored specs inspired by general principles (`original-spec`).
4. Link-only metadata where permissions are unclear (`link-only`).

Galleries and showcase sites are visual references only (`gallery-reference`, always L0).
They are never component sources.

Never copy third-party code, copy text, images, or icons into an entry. Never invent a URL,
license, author, or statistic. If you cannot verify a fact, leave it out or record
`verified_on: null` with status `draft`.

## Trust levels

| Level | Meaning | Agent may |
|---|---|---|
| L0 | Visual reference only | analyze principles; never copy |
| L1 | Design spec | implement independently from the spec |
| L2 | Licensed source example | adapt with attribution, under its license |
| L3 | Tested component | use as-is |

An entry is L3, or described as "production-ready", only when its implementation and
behavior were actually evaluated and `evidence` links to that evaluation. The validator
rejects "production-ready" (or "production ready") anywhere in a non-L3 entry.

## Lifecycle

`draft` → `reviewed` → `tested` → `deprecated`

- `draft`: incomplete or unverified. Required when `verified_on` is null, when the source is
  `link-only`, or when `license.redistribution` is `unknown`.
- `reviewed`: the content was checked against this guide on `verified_on`. In v0.4 all 30
  entries were reviewed by their author (Claude) only; independent human review is pending.
- `tested`: an implementation was evaluated; `evidence` must be non-empty.
- `deprecated`: requires `deprecation.note` (the changelog line) and
  `deprecation.replacement` (the id of a live entry). Search never returns deprecated entries.

`verified_on` older than 12 months is a warning (`craft catalog validate`); CI prints it, and
`--fail-on warn` makes it fail. `--today YYYY-MM-DD` makes the check deterministic.

## License gate

Third-party code is bundled only from entries whose SPDX id is on the allowlist:
MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, with redistribution `allowed` or
`attribution-required` and a `source.url`. An entry bundles code when it is L2 or L3 and its
source is not `original-spec`. Everything else is metadata and links only.

CI enforces this (`scripts/check-licenses.js` and `craft catalog validate`) and regenerates
the provenance section of `NOTICE.md` (`scripts/generate-notice.js --check`).

## Validation rules

`craft catalog validate` reports each problem with its rule id and a fix:

| Rule | Error when |
|---|---|
| `json`, `schema` | the file is not valid JSON or does not match the schema |
| `id-file`, `id-unique` | id differs from the file name, or is used twice (bundled and local together) |
| `l3-evidence`, `tested-evidence` | L3 without status tested and evidence; tested without evidence |
| `deprecation` | deprecated without note or live replacement; deprecation set on a live entry |
| `unclear-provenance` | link-only or unknown redistribution that is not draft, or is L2/L3 |
| `unverified` | `verified_on` is null and status is not draft |
| `l0-source`, `l0-code`, `gallery` | L0 that is not a reference, L0 with dependencies, a gallery above L0 |
| `source-url` | a third-party source without a URL outside draft |
| `license-allowlist` | bundled third-party code with an SPDX id off the allowlist or unclear redistribution |
| `production-ready` | the claim appears in a non-L3 entry |
| `verified-future` | `verified_on` is after today |
| `stale` (warning) | `verified_on` is more than 12 months old |
