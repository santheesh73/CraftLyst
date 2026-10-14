# Typography and spacing

Type and space carry most of an interface's hierarchy. Choose a scale, use it strictly.

## Contents

1. [Type scale](#1-type-scale)
2. [Families and voice](#2-families-and-voice)
3. [Readability](#3-readability)
4. [Hierarchy recipes](#4-hierarchy-recipes)
5. [Spacing scale](#5-spacing-scale)
6. [Rhythm](#6-rhythm)
7. [Fluid sizing](#7-fluid-sizing)
8. [Common mistakes](#8-common-mistakes)

## 1. Type scale

- Pick one ratio from the direction's range (`typeScaleRatio` in `recipes.json`): about 1.125–1.2
  for compact or formal, 1.2–1.25 balanced, 1.25–1.414 airy, editorial, or playful.
- Generate steps from the body size: `size(n) = body × ratio^n`. Round to whole pixels or
  to 0.125 rem; record the result as tokens.
- Five to seven steps cover most products (small, body, lead, h3, h2, h1, display).
- Large display sizes need tighter line-height (1.05–1.2) and slightly negative tracking.

## 2. Families and voice

- One family is enough for most products; two at most, plus monospace for code or data.
- Choose by voice (`voice` axis): neutral-sans, humanist, geometric, editorial-serif,
  technical-mono, display. Display faces are for headings only.
- System font stacks are a legitimate choice: fast, native, no license question.
- Web fonts: check the license allows web embedding; subset; preload only the one or two
  files used above the fold; set `font-display: swap` (or `optional` for non-brand text);
  define metric-compatible fallbacks to limit layout shift.
- Never claim a font is free or licensed for web use unless you verified its license.

## 3. Readability

- Body text: at least 16 px for reading surfaces; 13–15 px only in compact expert tools.
- Line length (measure): 45–80 characters for prose; set `max-width` in `ch`.
- Line-height: 1.4–1.7 for body; tighter for headings.
- Contrast: AA at minimum. Light gray body text is the most common failure.
- Left-align prose in LTR (right in RTL); avoid justified text on the web.
- Use real typographic characters: curly quotes, en and em dashes where the language uses
  them, non-breaking spaces between numbers and units.
- Numbers in tables: `font-variant-numeric: tabular-nums` and right alignment.

## 4. Hierarchy recipes

Contrast in one or two dimensions per level, not all at once:

| Level | Size | Weight | Color | Space before |
|---|---|---|---|---|
| Page title | h1 | bold | text | section |
| Section | h2 | bold or medium | text | stack-lg |
| Group label | small, caps or not | medium | text-muted | stack-md |
| Body | body | regular | text | stack-sm |
| Meta | small | regular | text-muted | stack-sm |

Do not skip heading levels for size; style the correct level instead (`a11y/semantics`).

## 5. Spacing scale

- Base unit from density: 4 px (compact, balanced) or 8 px (airy).
- A geometric-ish scale (for example 4, 8, 12, 16, 24, 32, 48, 64, 96) gives enough steps
  without near-duplicates. Record it as `primitive.space`.
- Semantic spacing tokens describe use: `inline-*` (between items in a row), `stack-*`
  (between items in a column), `section`, `gutter`.
- Only scale values appear in code (`tok/hardcoded` flags the rest).

## 6. Rhythm

- Proximity encodes relationships: space inside a group is smaller than space between groups.
  A heading sits closer to its content than to the previous section.
- Consistent vertical rhythm comes from using the same few stack tokens, not from a baseline grid.
- Vary section spacing deliberately to separate chapters of a page; uniform spacing
  everywhere flattens structure.

## 7. Fluid sizing

- Use `clamp()` for display sizes and section spacing that should scale with the viewport:
  `font-size: clamp(2rem, 1.2rem + 3vw, 3.5rem)`.
- Keep body text fixed in `rem` so user font-size preferences apply.
- Never use `vw` alone for text: it breaks browser zoom (WCAG 1.4.4). Always combine it
  with `rem` inside `clamp()`.

## 8. Common mistakes

- Many sizes that are each a couple of pixels apart: collapse them into the scale.
- Bold everywhere: reserve weight for real hierarchy.
- All-caps paragraphs or long buttons: hard to read; use caps only for short labels with
  extra tracking.
- Centered long text: center only short headings and single lines.
