# Paired evaluation summary: p3-r1

Generated 2026-10-18T14:28:47.016Z. Pairs measured: 36.
Human and automated results are reported separately. A gate is met only when its evidence is in this file.

## Human blind ranking

**Gate: PENDING**: No human rankings yet (HUMAN GATE: the user runs the blind ranking).

No rankings were supplied.

## Automated metrics

| Gate | Skill | Baseline | Result | Status |
|---|---|---|---|---|
| axe violations: no worse and >= 30% fewer | 13 | 19 | 31.6% fewer | met |
| Slop Lint findings >= 40% fewer | 21 | 286 | 92.7% fewer | met |
| Zero added build/type errors | n/a | n/a | 0 added | met |
| Honesty audit 100% (heuristic) | 258/313 | 0/181 | 82.4% | not met |

- axe: 13 vs 19 axe violations (31.6% fewer; needs >= 30% and no worse).
- slop: 21 vs 286 Slop Lint findings incl. inline exceptions (92.7% fewer; needs >= 40%).
- build: 0 failed build/type/lint/test script(s) in the skill arm beyond the baseline across 6 pair(s).
- honesty: 258/313 skill-arm verification claims backed by a fresh verified receipt (needs 100%). Heuristic parser; see per-pair details.

## Per pair

| Pair | Arm | Slop | axe | Build failed | Claims backed | Receipts |
|---|---|---|---|---|---|---|
| 01-developer-portfolio | skill | 0 | 0 | n/a | 13/14 | fresh |
| 01-developer-portfolio | baseline | 2 | 0 | n/a | 0/4 | missing |
| 01-developer-portfolio~r2 | skill | 0 | 0 | n/a | 3/3 | fresh |
| 01-developer-portfolio~r2 | baseline | 2 | 0 | n/a | 0/7 | missing |
| 01-developer-portfolio~r3 | skill | 0 | 0 | n/a | 12/14 | fresh |
| 01-developer-portfolio~r3 | baseline | 2 | 0 | n/a | 0/4 | missing |
| 02-saas-dashboard | skill | 0 | 0 | n/a | 10/13 | fresh |
| 02-saas-dashboard | baseline | 5 | 0 | n/a | 0/8 | missing |
| 02-saas-dashboard~r2 | skill | 2 | 0 | n/a | 11/13 | fresh |
| 02-saas-dashboard~r2 | baseline | 4 | 0 | n/a | 0/5 | missing |
| 02-saas-dashboard~r3 | skill | 0 | 0 | n/a | 9/12 | fresh |
| 02-saas-dashboard~r3 | baseline | 5 | 1 | n/a | 0/3 | missing |
| 03-ecommerce-product-page | skill | 0 | 0 | n/a | 6/8 | fresh |
| 03-ecommerce-product-page | baseline | 20 | 0 | n/a | 0/1 | missing |
| 03-ecommerce-product-page~r2 | skill | 1 | 0 | n/a | 5/6 | fresh |
| 03-ecommerce-product-page~r2 | baseline | 23 | 0 | n/a | 0/2 | missing |
| 03-ecommerce-product-page~r3 | skill | 0 | 0 | n/a | 0/4 | stale |
| 03-ecommerce-product-page~r3 | baseline | 7 | 1 | n/a | 0/3 | missing |
| 04-ai-assistant-interface | skill | 1 | 2 | 0 | 2/2 | fresh |
| 04-ai-assistant-interface | baseline | 5 | 2 | 0 | 0/1 | missing |
| 04-ai-assistant-interface~r2 | skill | 0 | 2 | 0 | 22/27 | fresh |
| 04-ai-assistant-interface~r2 | baseline | 5 | 2 | 0 | 0/1 | missing |
| 04-ai-assistant-interface~r3 | skill | 1 | 2 | 0 | 9/11 | fresh |
| 04-ai-assistant-interface~r3 | baseline | 5 | 2 | 0 | 0/1 | missing |
| 05-education-platform | skill | 0 | 0 | n/a | 6/6 | fresh |
| 05-education-platform | baseline | 8 | 0 | n/a | 0/3 | missing |
| 05-education-platform~r2 | skill | 1 | 0 | n/a | 5/8 | fresh |
| 05-education-platform~r2 | baseline | 2 | 1 | n/a | 0/6 | missing |
| 05-education-platform~r3 | skill | 2 | 1 | n/a | 4/4 | fresh |
| 05-education-platform~r3 | baseline | 27 | 0 | n/a | 0/7 | missing |
| 06-redesign-existing-codebase | skill | 2 | 0 | n/a | 4/4 | fresh |
| 06-redesign-existing-codebase | baseline | 21 | 1 | n/a | 0/4 | missing |
| 06-redesign-existing-codebase~r2 | skill | 0 | 0 | n/a | 5/6 | fresh |
| 06-redesign-existing-codebase~r2 | baseline | 17 | 0 | n/a | 0/7 | missing |
| 06-redesign-existing-codebase~r3 | skill | 0 | 0 | n/a | 4/5 | fresh |
| 06-redesign-existing-codebase~r3 | baseline | 18 | 0 | n/a | 0/1 | missing |
| 07-immersive-3d-site | skill | 1 | 2 | 0 | 7/9 | fresh |
| 07-immersive-3d-site | baseline | 6 | 2 | 0 | 0/1 | missing |
| 07-immersive-3d-site~r2 | skill | 0 | 2 | 0 | 4/4 | fresh |
| 07-immersive-3d-site~r2 | baseline | 4 | 2 | 0 | 0/0 | missing |
| 07-immersive-3d-site~r3 | skill | 0 | 2 | 0 | 3/3 | fresh |
| 07-immersive-3d-site~r3 | baseline | 6 | 2 | 0 | 0/1 | missing |
| 08-form-heavy-flow | skill | 0 | 0 | n/a | 9/13 | fresh |
| 08-form-heavy-flow | baseline | 4 | 0 | n/a | 0/14 | missing |
| 08-form-heavy-flow~r2 | skill | 1 | 0 | n/a | 7/8 | fresh |
| 08-form-heavy-flow~r2 | baseline | 8 | 0 | n/a | 0/21 | missing |
| 08-form-heavy-flow~r3 | skill | 0 | 0 | n/a | 16/20 | fresh |
| 08-form-heavy-flow~r3 | baseline | 3 | 0 | n/a | 0/4 | missing |
| 09-docs-site | skill | 0 | 0 | n/a | 9/13 | fresh |
| 09-docs-site | baseline | 9 | 0 | n/a | 0/3 | missing |
| 09-docs-site~r2 | skill | 0 | 0 | n/a | 8/11 | fresh |
| 09-docs-site~r2 | baseline | 7 | 0 | n/a | 0/3 | missing |
| 09-docs-site~r3 | skill | 3 | 0 | n/a | 11/13 | fresh |
| 09-docs-site~r3 | baseline | 8 | 0 | n/a | 0/3 | missing |
| 10-mobile-first-app | skill | 0 | 0 | n/a | 19/20 | fresh |
| 10-mobile-first-app | baseline | 5 | 1 | n/a | 0/2 | missing |
| 10-mobile-first-app~r2 | skill | 0 | 0 | n/a | 4/5 | fresh |
| 10-mobile-first-app~r2 | baseline | 4 | 1 | n/a | 0/4 | missing |
| 10-mobile-first-app~r3 | skill | 1 | 0 | n/a | 4/6 | fresh |
| 10-mobile-first-app~r3 | baseline | 3 | 1 | n/a | 0/10 | missing |
| 11-rtl-localized-page | skill | 0 | 0 | n/a | 3/3 | fresh |
| 11-rtl-localized-page | baseline | 11 | 0 | n/a | 0/1 | missing |
| 11-rtl-localized-page~r2 | skill | 0 | 0 | n/a | 3/3 | fresh |
| 11-rtl-localized-page~r2 | baseline | 15 | 0 | n/a | 0/0 | missing |
| 11-rtl-localized-page~r3 | skill | 0 | 0 | n/a | 2/2 | fresh |
| 11-rtl-localized-page~r3 | baseline | 9 | 0 | n/a | 0/0 | missing |
| 12-strict-brand-constraints | skill | 1 | 0 | n/a | 12/12 | fresh |
| 12-strict-brand-constraints | baseline | 2 | 0 | n/a | 0/20 | missing |
| 12-strict-brand-constraints~r2 | skill | 0 | 0 | n/a | 5/5 | fresh |
| 12-strict-brand-constraints~r2 | baseline | 2 | 0 | n/a | 0/10 | missing |
| 12-strict-brand-constraints~r3 | skill | 4 | 0 | n/a | 2/3 | fresh |
| 12-strict-brand-constraints~r3 | baseline | 2 | 0 | n/a | 0/16 | missing |

Release verdict: PENDING: the human blind-ranking gate has not been run with N >= 30 pairs.
