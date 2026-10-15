# Licensing

- Code (CLI, scripts, tests): Apache-2.0, see `LICENSE`.
- Documentation, references, template prose, catalog metadata: CC-BY-4.0, see `LICENSE-docs`.
- `CODE_OF_CONDUCT.md` is adapted from the Contributor Covenant 2.1 (CC-BY-4.0).

## Third-party code

No catalog entry bundles third-party code. The packaged CLI vendors its runtime
parser dependencies (postcss, parse5, @babel/parser and their runtime dependencies);
their licenses are listed in the package's `cli/THIRD-PARTY.md`. Catalog entries record
source, license, and SPDX id. Code may be bundled only when its SPDX id is on the allowlist:
MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD. Everything else is link-only
metadata. `NOTICE.md` is generated from catalog provenance.

## Attribution for CC-BY-4.0 material

"Frontend Craft" by Frontend Craft contributors, licensed under CC-BY-4.0, with a link to
this repository.
