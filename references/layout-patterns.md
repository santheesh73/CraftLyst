# Layout patterns

Page-level composition: choosing structure for the content and task, and avoiding the
default template shapes.

## Contents

1. [Choosing a layout](#1-choosing-a-layout)
2. [Pattern library](#2-pattern-library)
3. [Grids](#3-grids)
4. [Sections and rhythm](#4-sections-and-rhythm)
5. [Cards: when and when not](#5-cards-when-and-when-not)
6. [Template shapes to question](#6-template-shapes-to-question)
7. [Modern CSS layout toolkit](#7-modern-css-layout-toolkit)

## 1. Choosing a layout

Start from three facts: the primary task, the content shape, and the device mix.

| Content shape | Usually fits |
|---|---|
| One primary object (a product, an article, a record) | detail page: object first, supporting info beside or below |
| Many comparable items | table (compare attributes) or list (scan titles); grid only for visual items |
| A process with steps | single-column flow with progress; one decision per step |
| Monitoring many signals | dashboard: most important metric top-left, drill-down on click |
| Reading | single column, comfortable measure, generous margins |
| Workspace tool | app shell: navigation, canvas, inspector; resizable panes |

Pick the structure that makes the primary task fastest, then style it.

## 2. Pattern library

Short descriptions of reusable compositions. Use when the fit reasons apply.

- **Split statement**: statement and action on one side, real product view on the other.
  Fits products with a visual surface. Avoid with stock illustrations.
- **Editorial column**: one reading column with pull quotes, figures that break the column,
  and margin notes. Fits long-form content and documentation.
- **Index list**: dense, scannable rows with key attributes and a filter bar. Fits
  catalogs, logs, inboxes, search results.
- **Master-detail**: list on the left, selected item on the right; stacks on small screens.
  Fits email, tickets, records.
- **Bento of real data**: unequal tiles sized by importance, each showing live or real
  content. Fits dashboards and overviews. Equal tiles of icons and slogans are a clone grid.
- **Stepped flow**: one task per screen with persistent progress and back navigation.
  Fits onboarding, checkout, forms.
- **Canvas with inspector**: large work area, contextual properties panel. Fits editors,
  design and data tools.
- **Comparison table**: plans or products as columns, attributes as rows, recommended
  column marked with text, not just color. Fits pricing and spec comparisons.

## 3. Grids

- Define a content max width (for example 1200–1440 px for apps, 65–75 ch for reading).
- Column count follows content, not convention: 12 is flexible, 4 or 6 is often enough.
- Use the gutter token for gaps; margins grow with viewport width (`clamp()`).
- Break the grid on purpose (full-bleed media, an offset heading) to create emphasis.
  Breaking it everywhere is no grid.

## 4. Sections and rhythm

- Each section has one job; its heading says that job in the user's language.
- Alternate section types (statement, evidence, detail, action) instead of repeating one shape.
- Lead with evidence the product works: real screenshots, real data, real customer
  quotes with attribution. If none exist yet, say less rather than inventing proof.
- End pages with a next step, not with a repeated hero.

## 5. Cards: when and when not

Use a card when the item is a discrete object the user can select, move, open, or compare,
and it needs a boundary to be perceived as one thing.

Do not use cards to:
- wrap every section of a page (use spacing and headings);
- nest inside other cards (`lay/card-depth`);
- make text "feel designed".

Alternatives: whitespace groups, dividers, background bands, a list with rows, a table.

## 6. Template shapes to question

Not banned, but each needs a reason recorded in the contract:

- Centered gradient hero with a headline, subline, two buttons, and a floating screenshot.
- Three (or six) identical feature tiles with icon, heading, and two lines (`lay/clone-grid`).
- Logo cloud with "Trusted by" and no source (`con/fabricated`).
- Testimonial carousel with stock avatars and no attribution (`con/fabricated`).
- Every section in a rounded, shadowed container (`vis/default-stack`, `lay/card-depth`).
- Stat strip with round invented numbers ("99.9 % uptime, 10k+ users").

## 7. Modern CSS layout toolkit

- Flexbox for one-dimensional rows and stacks; Grid for two-dimensional layouts and for
  aligning content across rows (`subgrid` where supported).
- `gap` instead of margins between siblings.
- Container queries (`@container`) for components that live in different widths; media
  queries for page-level changes.
- `minmax()` and `auto-fit` for responsive item grids without breakpoints:
  `grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))`.
- Logical properties (`margin-inline`, `padding-block`, `inset-inline-start`) so RTL works.
- `min-width: 0` on flex and grid children that contain long text or tables, to prevent
  overflow.
