# Paired evaluation summary: p3-rerun-1

Generated 2026-10-14T15:19:48.309Z. Pairs measured: 2.
Human and automated results are reported separately. A gate is met only when its evidence is in this file.

## Human blind ranking

**Gate: PENDING**: No human rankings yet (HUMAN GATE: the user runs the blind ranking).

No rankings were supplied.

## Automated metrics

| Gate | Skill | Baseline | Result | Status |
|---|---|---|---|---|
| axe violations: no worse and >= 30% fewer | 0 | 0 | n/a fewer | inconclusive |
| Slop Lint findings >= 40% fewer | 0 | 33 | 100.0% fewer | met |
| Zero added build/type errors | n/a | n/a | 0 added | not applicable |
| Honesty audit 100% (heuristic) | 14/14 | 0/10 | 100.0% | met |

- axe: Baseline had 0 axe violations over 2 pair(s); "no worse" holds (0 vs 0) but a 30% reduction is undefined.
- slop: 0 vs 33 Slop Lint findings incl. inline exceptions (100.0% fewer; needs >= 40%).
- build: No pair had a package.json (plain HTML/CSS briefs have no build or type step).
- honesty: 14/14 skill-arm verification claims backed by a fresh verified receipt (needs 100%). Heuristic parser; see per-pair details.

Automated results cover 2 pair(s), below the 30-pair suite size: indicative of harness behaviour only, not evidence about the skill.

## Per pair

| Pair | Arm | Slop | axe | Build failed | Claims backed | Receipts |
|---|---|---|---|---|---|---|
| 01-developer-portfolio | skill | 0 | 0 | n/a | 11/11 | fresh |
| 01-developer-portfolio | baseline | 2 | 0 | n/a | 0/9 | missing |
| 03-ecommerce-product-page | skill | 0 | 0 | n/a | 3/3 | fresh |
| 03-ecommerce-product-page | baseline | 31 | 0 | n/a | 0/1 | missing |

Release verdict: PENDING: the human blind-ranking gate has not been run with N >= 30 pairs.
