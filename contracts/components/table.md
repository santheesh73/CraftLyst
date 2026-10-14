# Contract: Table (sort and filter)

Status: v0.5 · Conformance suite: `table` · Principles: WAI-ARIA Authoring Practices (table and sortable table patterns; grid only when cells are interactive)

## Purpose

Present records in rows and columns so users can scan, compare, sort, and filter.

## When not to use

- Layout: never use tables for layout.
- One-dimensional lists: use a list.
- Spreadsheet-style cell editing: a `grid` with full grid keyboard support (beyond this contract).

## States matrix

| State | Requirement |
|---|---|
| default | Caption or accessible name; header cells for columns (and rows when useful). |
| sorted | Exactly one column header has `aria-sort="ascending"` or `"descending"`; visual arrow plus text alternative. |
| hover | Row highlight on pointer is optional; never the only cue for selection. |
| focus-visible | Sort buttons and row actions show a ring. |
| loading | Keep headers; show progress in the body; announce completion politely. |
| empty | "No results for 'xyz'" with a way to clear filters. Zero, one, many, very many rows all tested. |
| error | Say the data failed to load and offer retry. |

## Keyboard map

| Key | Action |
|---|---|
| Tab | Moves through sort buttons, filter input, and interactive cells in reading order. |
| Enter / Space on a sort button | Sorts by that column; repeats toggle the direction. |
| Typing in the filter | Filters rows; results count announced politely. |
| (grid only) Arrow keys | Move between cells. |

## ARIA pattern

- Native `<table>` with `<caption>`, `<th scope="col">`; or `role="table"`/`"grid"` with `columnheader`/`row`/`cell`.
- Sort control: a `<button>` inside the `<th>` (or a focusable columnheader in a grid); `aria-sort` on the header cell, not the button.
- Filter: a labelled input; a `role="status"` region for "N results".

## Responsive rules

- Narrow screens: scroll the table horizontally inside its own container (with a visible cue and a focusable, labelled scroll region), or reflow rows into cards that keep header labels.
- Never let the page itself scroll horizontally.
- Numbers right-aligned with tabular figures.

## Failure cases

- `div` rows with no table semantics (fails `table/semantics`).
- Clickable header text with no button (fails `table/sort-button`).
- Sort arrow drawn but no `aria-sort` (fails `table/sort-state`).
- Unlabelled filter (fails `table/filter-name`).

## Guidance

Default sort by the most useful column. Keep the sort and filter state in the URL for shareable views.

## Conformance coverage

| Requirement | Check |
|---|---|
| Table or grid with headers and rows | `table/semantics` |
| Sort control is a named button in the header | `table/sort-button` |
| `aria-sort` toggles ascending/descending | `table/sort-state` |
| Keyboard sort reorders rows | `table/sort-order` |
| Filter labelled | `table/filter-name` |
| Filter reduces rows | `table/filter-works` |
| No axe-core violations | `table/axe` |

Adapter keys: `table` (required), `rows` (body row selector), `sortButton`, `filterInput`, `filterValue`, `region`.
