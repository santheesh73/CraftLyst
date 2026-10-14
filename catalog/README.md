# Catalog

Pattern catalog (P4): entry cards that describe page compositions, components, motion
patterns, specialized product surfaces, and design-system recipes, each with its design
characteristics, axis fit, stack compatibility, interaction, responsive and accessibility
notes, license, trust level, lifecycle status, and known limitations.

| Path | What |
|---|---|
| `catalog-schema.json` | JSON Schema for one entry card |
| `entries/<id>.json` | one entry per file; the file name equals the id |
| `index/index.json` | generated offline search index (ADR-0014); do not edit by hand |

v0.4 ships 30 entries, all L1 original specs written for this project (CC-BY-4.0, attribution
"Frontend Craft contributors"). There are no L0 link-only entries yet: none were added
without a verified URL and attribution.

## Use

```bash
craft search "sortable table with bulk actions" --stack react,tailwind-v4 --trust L1,L2 --limit 5
craft catalog validate            # schema + cross-field rules, staleness warnings
craft index build                 # project: index bundled + .craft/catalog/*.json into .craft/catalog-index.json
```

Search returns compact cards (id, trust, status, intent, score, file path). Read only the
entry files you use; never load the whole catalog into an agent's context.

## Maintain

```bash
node scripts/build-index.js        # rebuild index/index.json after changing entries (CI: --check)
node scripts/check-licenses.js     # license gate for bundled third-party code
node scripts/generate-notice.js    # regenerate NOTICE.md provenance (CI: --check)
npm run catalog                    # all catalog checks, as CI runs them
```

How to write an entry, trust levels, lifecycle, and the license gate:
[docs/catalog-contribution.md](../docs/catalog-contribution.md).
