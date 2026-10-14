# Contract: Accordion and disclosure

Status: v0.5 · Conformance suite: `accordion-disclosure` · Principles: WAI-ARIA Authoring Practices (accordion and disclosure patterns)

## Purpose

Show and hide sections of content under headed buttons. A disclosure is one such section; an accordion is a stack of them.

## When not to use

- Content most users need: show it. Hidden content is skipped.
- Switching between peer views: use tabs ([tabs.md](tabs.md)).
- Page-level navigation menus: see [navigation.md](navigation.md).

## States matrix

| State | Requirement |
|---|---|
| collapsed | `aria-expanded="false"`; panel hidden from everyone (`hidden` or not rendered). |
| expanded | `aria-expanded="true"`; panel visible. |
| hover | Pointer only. |
| focus-visible | Ring on the header button. |
| disabled | Avoid; if a section cannot collapse, render it as plain content. |

## Keyboard map

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between header buttons and into open panels. |
| Enter / Space | Toggles the focused section. |
| ArrowDown / ArrowUp, Home / End | Optional: move between headers. |

## ARIA pattern

- Header: a heading element containing a `<button>` with `aria-expanded` and `aria-controls` the panel.
- Panel: optionally `role="region"` with `aria-labelledby` the button (only for a handful of panels; many regions add noise).
- Native `<details>`/`<summary>` is acceptable for simple disclosures.

## Responsive rules

- Header buttons span the full width; at least 44px tall on touch.
- Avoid nesting accordions inside accordions on small screens.

## Failure cases

- Clickable `div` headers (fails `accordion/button`, `accordion/enter`).
- No `aria-expanded` (fails `accordion/expanded`).
- Collapsed panel hidden with only `height: 0` but still focusable or visible to screen readers (fails `accordion/collapsed-hidden`).

## Guidance

Header text summarizes the panel. Allow several open at once unless there is a real reason not to.

## Conformance coverage

| Requirement | Check |
|---|---|
| Header is a button | `accordion/button` |
| Expanded state | `accordion/expanded` |
| `aria-controls` target exists | `accordion/controls` |
| Enter expands and shows the panel | `accordion/enter` |
| Space toggles | `accordion/space` |
| Collapsed panels hidden | `accordion/collapsed-hidden` |
| No axe-core violations | `accordion/axe` |

Adapter keys: `triggers` (required, matches every header button), `region`.
