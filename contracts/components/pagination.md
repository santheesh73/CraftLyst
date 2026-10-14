# Contract: Pagination

Status: v0.5 · Conformance suite: `pagination` · Principles: WAI-ARIA Authoring Practices (landmark regions), WCAG 2.2 (2.4.4, 2.4.8)

## Purpose

Move between pages of a result set while showing where the user is.

## When not to use

- Short lists: show everything.
- Feeds read top to bottom: "Load more" (a button that keeps focus in place) is often better.
- Infinite scroll without a footer escape hatch: avoid.

## States matrix

| State | Requirement |
|---|---|
| default | Links (or buttons for client-side paging) with numbers and previous/next. |
| current | `aria-current="page"` on the current page; visually distinct by more than color. |
| hover / focus-visible | Ring on focus; targets at least 24px, 44px on touch. |
| disabled | Previous on page 1 and next on the last page: removed, or `aria-disabled="true"` and not a link. |
| loading | Keep the control; indicate the page is loading; move focus to the results heading after load. |
| empty | No pagination when there is one page. |

## Keyboard map

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves through the page links. |
| Enter | Follows the link (Space too for buttons). |

## ARIA pattern

- `<nav aria-label="Pagination">` around a list of links.
- Arrow-only links need names ("Previous page", "Next page").
- After client-side paging, move focus to the top of the new results or announce the new page.

## Responsive rules

- On narrow screens show previous, next, current, first, and last; collapse the rest into an ellipsis that is not a fake link.
- No horizontal scroll.

## Failure cases

- Pagination in a plain `div` with no landmark name (fails `pagination/landmark`).
- Current page shown only with color (fails `pagination/current`).
- Icon-only arrows without names (fails `pagination/names`).

## Guidance

Show the total ("Page 2 of 14") near the controls. Keep page size stable.

## Conformance coverage

| Requirement | Check |
|---|---|
| Named navigation landmark | `pagination/landmark` |
| Exactly one `aria-current` | `pagination/current` |
| Every control named | `pagination/names` |
| No axe-core violations | `pagination/axe` |

Adapter keys: `nav` (required), `region`.
