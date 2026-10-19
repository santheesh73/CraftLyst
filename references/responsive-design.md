# Responsive design

Interfaces work from 320 px to wide desktops, with touch, mouse, keyboard, zoom, and
real content.

## Contents

1. [Approach](#1-approach)
2. [Breakpoints and container queries](#2-breakpoints-and-container-queries)
3. [Reflow and overflow](#3-reflow-and-overflow)
4. [Touch and input](#4-touch-and-input)
5. [Images and media](#5-images-and-media)
6. [Content stress](#6-content-stress)
7. [Internationalization and RTL](#7-internationalization-and-rtl)
8. [Verification](#8-verification)

## 1. Approach

- Design the smallest layout first for content priority, then add space and columns.
- Responsive is not shrinking: reorder, collapse, and progressively disclose by priority.
- Every page has `<meta name="viewport" content="width=device-width, initial-scale=1">` and
  never disables zoom (`rsp/viewport`).

## 2. Breakpoints and container queries

- Breakpoints come from where the content breaks, stored as tokens; common anchors are
  roughly 480, 768, 1024, 1440 px.
- Components that appear in different column widths use container queries:

```css
.card-list { container-type: inline-size; }
@container (min-width: 40rem) { .card { grid-template-columns: 8rem 1fr; } }
```

- Page structure (navigation pattern, number of columns) uses media queries.

## 3. Reflow and overflow

- At 320 px CSS width there must be no horizontal page scroll (WCAG 1.4.10, `rsp/overflow`).
  Exceptions are content that needs two dimensions (data tables, maps, code), which scroll
  inside their own labelled, focusable container.
- Common causes: fixed widths, long unbroken strings (URLs, IDs), wide tables, `100vw`
  with a scrollbar, negative margins, flex children without `min-width: 0`.
- Fixes: `max-width: 100%`, `overflow-wrap: anywhere` for user content, `minmax(0, 1fr)`,
  local scroll containers.
- Text resize to 200 % must not cut off or overlap content (WCAG 1.4.4). Use `rem` for type
  and avoid fixed heights on text containers.

## 4. Touch and input

- Targets: 44×44 px for touch layouts (`a11y/target`); never below 24×24 px.
- Spacing between adjacent targets prevents mis-taps.
- Use `@media (hover: hover) and (pointer: fine)` for hover-only enhancements; never hide
  essential actions behind hover.
- Use the correct input `type` and `inputmode` so mobile keyboards fit the data.
- Respect safe areas on notched devices: `padding: env(safe-area-inset-*)` for fixed bars.
- Use `100dvh` (or `svh`) instead of `100vh` for full-height mobile layouts.

## 5. Images and media

- `srcset`/`sizes` or `<picture>` for responsive images; modern formats (AVIF, WebP) with fallback.
- Always set `width` and `height` (or `aspect-ratio`) to prevent layout shift.
- `loading="lazy"` below the fold; the LCP image is never lazy and may get `fetchpriority="high"`.
- Art direction: crop differently for small screens with `<picture>` rather than shrinking.
- Video: no autoplay with sound; provide captions; respect reduced motion for autoplaying loops.

## 6. Content stress

Test layouts with:

- strings 3× longer than the design sample (German, Finnish, user names, product titles);
- empty states, one item, and 1,000 items;
- missing images, failed requests, slow responses;
- numbers with many digits and negative values;
- 200 % text zoom and browser zoom to 400 % at 1280 px (equivalent to 320 px reflow).

## 7. Internationalization and RTL

- Use logical properties (`margin-inline-start`, `text-align: start`) throughout.
- Set `dir="rtl"` and `lang` correctly; test mirrored layouts; do not mirror logos, media
  controls, or numbers that should stay LTR.
- Never build sentences by concatenating translated fragments; leave room for expansion.
- Format dates, numbers, and currencies with `Intl` APIs.

## 8. Verification

Tier 2 checks (`craft shoot`) render at 320, 375, 768, 1280, and 1920 px and
detect overflow. Without Playwright, resize a browser if one is available to you; otherwise
report responsiveness as not verified and list what should be checked by a human.
