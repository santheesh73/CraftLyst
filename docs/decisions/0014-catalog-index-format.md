# ADR-0014: Catalog index format and offline search

- Status: accepted
- Date: 2026-10-14

## Context

P4 adds a pattern catalog (`catalog/entries/*.json`, schema `catalog/catalog-schema.json`).
The agent must find 3-5 fitting entries for an intent without loading the whole catalog
into its context, with no network at query time and no new dependencies. Output must be
deterministic so tests and proof reports are stable. The CLI may write only inside the
user's `.craft/` (ADR-0007); packaging writes only `dist/`.

## Decision

**Algorithm.** A lexical BM25F-style index (k1 = 1.2, b = 0.75). Each entry's fields are
tokenized (lowercase, accent folding, split on non-alphanumerics, a fixed stopword list,
a light suffix stemmer for plurals and -ing/-ed) and weighted: title 3, tags 2.5, intent 2,
characteristics 1.5, description 1, category 1, interaction/responsive/accessibility notes
0.5. A term's weighted frequency is the sum of its field weights; document length is the
weighted token count. No embeddings, no synonyms, no network.

**File format.** One JSON object, no timestamps, keys in fixed order, one doc or term per
line for readable diffs:

- `schemaVersion` (`"1"`), `kind`, `algorithm`, `params`, `fieldWeights`
- `digest`: sha256 over the indexed entries (path + content), `bundledDigest` in local indexes
- `entryCount`, `avgLen`
- `docs[]`: compact cards only (id, title, category, trust, status, intent, path, origin,
  axes, frameworks, styling, replacement, len), sorted by id
- `terms`: term → `[[docIndex, weightedTf], ...]`, terms sorted

Numbers are rounded to three decimals. The same entries always produce byte-identical output.

**Where indexes live.**

- The repository commits `catalog/index/index.json`, built by `node scripts/build-index.js`.
  CI runs `--check` and fails if it differs from a fresh build. `npm run package` rebuilds
  it from the shipped entries into `dist/frontend-craft/catalog/index/index.json`, next to
  `catalog/entries/`, so the installed skill searches offline with no build step.
- `craft index build` in a user's project indexes the bundled entries plus the project's own
  entries in `.craft/catalog/*.json` and writes `.craft/catalog-index.json`. Invalid entries
  are left out and reported (exit 1). It never writes into the skill directory.
- `craft search` reads `.craft/catalog-index.json` when present (and warns when its
  `bundledDigest` no longer matches the shipped index), otherwise the shipped index. With
  neither, it exits 3 and says to run `craft index build`. `--catalog <dir>` points at
  another catalog root (tests, catalog authors).

**Search semantics.** Rank by BM25F score, ties by id. Filters are hard constraints applied
after scoring: `--trust`, `--category`, `--axes key=value` (an entry that declares no fit for
that axis passes; axis keys and positions are checked against `tokens/recipes.json`),
`--stack` (framework and/or styling values; entries listing `any` match every stack; `next`
also matches `react` entries). Deprecated entries are never returned. `--limit` defaults to
5 and is clamped to 1-10. Results are cards with the absolute path of the entry file; the
agent reads only the files it uses.

## Consequences

- Fast, dependency-free, and reproducible; the index is about 50 KB for 30 entries.
- Lexical matching misses paraphrases (measured in `docs/evals/catalog-precision.md`: the
  best entry was missing from the top 5 for 2 of 20 queries). Synonym expansion or
  embeddings would need a new ADR.
- Changing tokenization or weights changes rankings; bump `schemaVersion` when the file
  layout changes, and re-run the precision spot-check when ranking changes.
