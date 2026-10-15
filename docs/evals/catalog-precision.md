# Catalog search precision spot-check (P4)

P4 gate item: "spot-check relevance on 20 sample queries and report precision honestly".

**Result on the 30-entry catalog: the top result was relevant for 18 of 20 queries; macro
precision@3 is 0.350 and macro precision@5 is 0.265; 24 of the 27 entries judged relevant
appeared in the top 5 (recall@5 0.889).**

Read these numbers with three caveats:

1. **Judged by Claude, not a human.** Claude wrote the queries, the entries, and the
   relevance judgments. That is a conflict of interest: the entry vocabulary and the query
   wording come from the same author. A human re-judging the table below (and writing their
   own queries) would make this a verified number.
2. **The catalog is small.** With 30 entries, most queries have only one or two relevant
   entries, so precision@5 cannot be high: with these judgments the best possible macro
   precision@5 is 0.295. Precision@5 mainly measures how much noise fills the remaining
   slots; top-1 and recall@5 say more at this size.
3. **Lexical search.** Ranking is BM25F over entry text (ADR-0014), with no synonyms. Both
   misses are paraphrase failures: "jump to any action with the keyboard" never surfaced
   `command-palette`, and "narrow down product listing results by brand and price" ranked
   `product-detail-page` first and missed `faceted-filter-panel`.

## Method

- Index: `catalog/index/index.json` as committed with the 30 entries (built by
  `node scripts/build-index.js`).
- 20 queries phrased the way an agent states an intent mid-task; 8 carry filters
  (`--axes`, `--stack`, `--category`, `--trust`). Default limit 5.
- After the queries were run, each was judged against all 30 entries (not only the returned
  ones): which entries would genuinely help an agent with that intent. Judging after seeing
  the ranking can bias toward the results; to counter that, judgments were strict: an entry
  that only shares a word (for example a dashboard for an invoice list) counts as not relevant.
- precision@k = relevant results in the top k / min(k, results returned); macro = mean
  over queries. recall@5 = relevant entries in the top 5 / all entries judged relevant.
- Re-run: `node scripts/eval/catalog-precision.js` prints the table below from the current
  index; the judgments live in that script.
- Not tuned on these queries: the index weights and tokenizer were fixed before the
  queries were written, and nothing was changed after seeing the results.

## Per-query results

| # | Query | Filters | Top 5 (relevant? id (score)) | P@3 | P@5 | Relevant entry missed |
|---|---|---|---|---|---|---|
| 1 | admin screen listing invoices that users sort and filter | none | yes data-table-sort-filter (11.336)<br>no dashboard-overview-kpi-table (9.073)<br>no view-transition-list-reorder (7.069)<br>no search-results-page (6.743)<br>yes faceted-filter-panel (4.659) | 1/3 | 2/5 | none |
| 2 | landing page pricing tiers with annual billing toggle | none | yes pricing-plan-comparison (15.673)<br>yes segmented-control (5.666)<br>no scroll-linked-reveal-reduced-motion (4.332)<br>no empty-state-first-workspace (2.249)<br>no faceted-filter-panel (1.977) | 2/3 | 2/5 | none |
| 3 | blog post reading experience | --axes density=airy | yes editorial-long-form-article (7.375)<br>no rtl-aware-layout (2.257)<br>no scroll-linked-reveal-reduced-motion (0.985)<br>no token-scale-recipe (0.958) | 1/3 | 1/4 | none |
| 4 | developer documentation site navigation | --stack astro | yes docs-layout-sidebar-toc (13.745)<br>no code-review-diff-view (3.709)<br>no command-palette (2.366)<br>no multi-step-stepper (2.172)<br>no combobox-autocomplete (1.625) | 1/3 | 1/5 | none |
| 5 | let users quickly jump to any action with the keyboard | none | no dashboard-overview-kpi-table (5.843)<br>no combobox-autocomplete (4.606)<br>no view-transition-list-reorder (4.115)<br>no data-table-sort-filter (3.949)<br>no pricing-plan-comparison (3.67) | 0/3 | 0/5 | command-palette |
| 6 | signup form error messages | --stack react,tailwind-v4 | yes inline-validation-form (11.724)<br>no toast-notification-queue (4.187)<br>no empty-state-first-workspace (3.91)<br>no skeleton-to-content-loading (3.829)<br>no combobox-autocomplete (3.793) | 1/3 | 1/5 | none |
| 7 | checkout split into several steps | none | yes multi-step-stepper (8.136)<br>no product-detail-page (5.156)<br>no faceted-filter-panel (4.819)<br>no map-list-split-view (3.55)<br>no code-review-diff-view (3.009) | 1/3 | 1/5 | none |
| 8 | show loading state while data fetches | --category motion | yes skeleton-to-content-loading (5.06)<br>no view-transition-list-reorder (1.345)<br>no scroll-linked-reveal-reduced-motion (0.895) | 1/3 | 1/3 | none |
| 9 | animate cards when the user scrolls down a marketing page | --axes motion=subtle | yes scroll-linked-reveal-reduced-motion (7.669)<br>no map-list-split-view (3.984)<br>no view-transition-list-reorder (3.912)<br>no product-detail-page (2.799)<br>no search-results-page (2.652) | 1/3 | 1/5 | none |
| 10 | chatbot interface for an LLM product | none | yes ai-chat-transcript-streaming-citations (5.538)<br>no product-detail-page (2.184)<br>no ecommerce-variant-picker (2.064)<br>no onboarding-checklist-home (1.774)<br>no combobox-autocomplete (1.231) | 1/3 | 1/5 | none |
| 11 | pull request review screen | --axes density=compact | yes code-review-diff-view (11.85)<br>no toast-notification-queue (1.953)<br>no dashboard-overview-kpi-table (0.889)<br>no command-palette (0.717)<br>no faceted-filter-panel (0.586) | 1/3 | 1/5 | none |
| 12 | store locator with map | none | yes map-list-split-view (13.479)<br>no dark-mode-semantic-mapping (3.204)<br>no inline-validation-form (1.387) | 1/3 | 1/3 | none |
| 13 | book an appointment time slot | none | yes calendar-scheduling-week-view (19.292)<br>no dashboard-overview-kpi-table (2.615)<br>no toast-notification-queue (2.473)<br>no pricing-plan-comparison (1.297) | 1/3 | 1/4 | none |
| 14 | support Arabic and Hebrew | none | yes rtl-aware-layout (10.325)<br>no dark-mode-semantic-mapping (2.119)<br>no combobox-autocomplete (1.625)<br>no command-palette (1.613)<br>no scroll-linked-reveal-reduced-motion (1.531) | 1/3 | 1/5 | none |
| 15 | choose size and color of a shirt | none | yes ecommerce-variant-picker (4.536)<br>no token-scale-recipe (2.471)<br>no file-upload-dropzone (2.191)<br>no dark-mode-semantic-mapping (2.14)<br>no density-modes (2.033) | 1/3 | 1/5 | product-detail-page |
| 16 | light and dark theme tokens | --category design-system | yes dark-mode-semantic-mapping (19.083)<br>no token-scale-recipe (3.447)<br>no density-modes (3.068) | 1/3 | 1/3 | none |
| 17 | new user first run setup | none | yes onboarding-checklist-home (12.406)<br>yes empty-state-first-workspace (4.987)<br>no view-transition-list-reorder (3.021)<br>yes multi-step-stepper (2.932)<br>no command-palette (2.64) | 2/3 | 3/5 | none |
| 18 | confirm before deleting a project | none | yes destructive-action-confirmation (7.916)<br>yes toast-notification-queue (4.077)<br>no token-scale-recipe (3.363)<br>no file-upload-dropzone (2.121)<br>no multi-step-stepper (1.942) | 2/3 | 2/5 | none |
| 19 | notify the user that the save succeeded with undo | none | yes toast-notification-queue (4.324)<br>no destructive-action-confirmation (4.089)<br>no faceted-filter-panel (3.378)<br>no density-modes (0.417)<br>no ai-chat-transcript-streaming-citations (0.403) | 1/3 | 1/5 | none |
| 20 | narrow down product listing results by brand and price | --trust L1,L2 | no product-detail-page (6.458)<br>no code-review-diff-view (5.39)<br>no combobox-autocomplete (5.164)<br>no ecommerce-variant-picker (5.149)<br>yes search-results-page (4.721) | 0/3 | 1/5 | faceted-filter-panel |

## Summary

| Metric | Value |
|---|---|
| Queries | 20 (8 with filters) |
| Top-1 relevant | 18 / 20 |
| Macro precision@3 | 0.350 |
| Macro precision@5 | 0.265 (ceiling with these judgments: 0.295) |
| Recall@5 | 24 / 27 = 0.889 |
| Judge | Claude (not a human) |

## What would improve it

- More entries per intent (P5+ adds more), which raises the precision@5 ceiling.
- A small, reviewed synonym list (for example "jump" and "quick" for palette-style
  navigation, "narrow" for facets) recorded in a follow-up ADR, re-measured on fresh queries
  written by someone other than the entry author.
