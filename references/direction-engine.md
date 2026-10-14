# Direction Engine

A reproducible procedure for choosing a design direction and turning it into tokens.
Data lives in `tokens/recipes.json` (axis positions mapped to token ranges).

## Contents

1. [When to run it](#1-when-to-run-it)
2. [Step 1: brief extraction](#step-1-brief-extraction)
3. [Step 2: position on axes](#step-2-position-on-axes)
4. [Step 3: two divergent directions](#step-3-two-divergent-directions)
5. [Step 4: swap test](#step-4-swap-test)
6. [Step 5: axes to token recipes](#step-5-axes-to-token-recipes)
7. [Step 6: existing system present](#step-6-existing-system-present)
8. [Worked example](#worked-example)

## 1. When to run it

- Size L work (new app, redesign): always, steps 1–5.
- Size M work with no `.craft/` yet: steps 1–5, lighter (one paragraph per step).
- An existing, working design system: skip to step 6.
- `.craft/DESIGN.md` already exists: do not rerun; read it and follow it. Rerun only when
  the user asks for a new direction, and log the change in `decisions.md`.

## Step 1: brief extraction

Ask **at most 5** questions, and skip any the request or repo already answers:

1. Product: what is it and what job does it do?
2. Audience: who uses it, how often, on what device?
3. Primary task: the one thing a user must accomplish?
4. Content type: data, long-form text, media, forms, code?
5. Constraints: brand rules, existing system, accessibility target, locales, deadlines?

If the user is unavailable, make reasonable assumptions, state them, and record them
under "Open questions and assumptions" in `DESIGN.md`.

## Step 2: position on axes

Pick one position per axis, each with a one-line reason tied to step 1. Positions are the
keys in `recipes.json`:

| Axis | Positions | Question it answers |
|---|---|---|
| density | compact, balanced, airy | how much per screen, how often scanned |
| temperature | warm, neutral, cool | human and hospitable vs. precise |
| formality | playful, approachable, formal | stakes of the context |
| motion | still, subtle, expressive | what motion is for |
| shape | sharp, mixed, soft | structural vs. friendly edges |
| contrast | low, medium, high | visual drama between elements (text always meets AA) |
| voice | neutral-sans, humanist, geometric, editorial-serif, technical-mono, display | what the letterforms say |
| imagery | type-led, balanced, imagery-led | words vs. pictures |

A reason must reference the product or audience. "Compact: analysts compare 40 rows at
once" is a reason. "Compact: looks modern" is not.

Check `conflicts` in `recipes.json`; if a combination is listed, resolve it or justify it.

## Step 3: two divergent directions

Write two directions that differ on at least three axes. For each: axis values, a
signature move, and one sentence on how the first screen would look. Choose one with a
stated reason. Log the rejected one in `decisions.md` (what, why it lost).

Divergence matters: two variations of the same idea are one direction.

## Step 4: swap test

Ask: would this design fit an unrelated product (a bank, a bakery, a dev tool) unchanged?
If yes, it is generic. Regenerate the signature move or shift axes until the answer is no.
Record the result in `decisions.md`.

## Step 5: axes to token recipes

For each token key, collect the ranges from every chosen axis position in `recipes.json`:

1. **Intersect** overlapping ranges for the same key (for example `typeScaleRatio` from
   density, formality, and imagery).
2. If ranges do not overlap, the axis that comes first in `precedence` wins; note the
   tension in `decisions.md`.
3. Pick concrete values inside the final ranges. Prefer simple, explainable numbers
   (a 1.25 ratio, a 4 px base).
4. Write primitives, then semantic roles, then component tokens into `.craft/tokens.json`,
   with light and dark mappings and the contrast `pairs` you rely on.
5. Run `craft contrast` and fix any pair below AA before writing UI code.
6. Summarize the tokens in section 4 of `DESIGN.md`.

Color hue is never prescribed by the recipes: temperature constrains neutral tint and
chroma; the accent hue comes from the brand or the product's world.

## Step 6: existing system present

When the repo already has a working design system (Tailwind theme, CSS variables, a
component library, design tokens):

- Never overwrite or migrate it.
- Extract the contract from it: read the theme/config and components, then write
  `DESIGN.md` and `tokens.json` that describe what exists (`craft init --from-repo` in v0.2;
  by hand until then). Mark `meta.source` as `extracted`.
- Infer axis values from what exists and say so; ask the user to confirm.
- New work follows the extracted contract. Gaps are proposed as additions, not replacements.

## Worked example

Brief: an internal tool where warehouse leads reassign pick routes on a tablet during a shift.

- density compact: leads compare 20–40 routes at once; touch still needs 44 px targets,
  so `controlHeight` takes the higher end of compact.
- temperature cool: reads as exact; the floor is noisy and status must be unambiguous.
- formality approachable: staff use it all day; plain language, no ceremony.
- motion still: reassignments must feel instant; no decorative motion on a work surface.
- shape mixed: small control radii, square table cells.
- contrast medium; voice technical-mono for route codes and counts; imagery type-led.
- Rejected: an airy, card-based layout. It showed 6 routes per screen instead of 30.
- Signature move: route codes are set in mono with a colored lane stripe matching the
  physical floor markings, so the screen maps to the building.
- Swap test: lane stripes keyed to floor markings would be meaningless in a bakery app. Passed.
