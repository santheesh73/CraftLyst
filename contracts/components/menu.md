# Contract: Menu (menu button)

Status: v0.5 · Conformance suite: `menu` · Principles: WAI-ARIA Authoring Practices (menu button and menu patterns)

## Purpose

A button that opens a short list of actions (Duplicate, Archive, Delete) or settings (checkbox or radio items).

## When not to use

- Site or app navigation: use links in a `nav` with disclosure submenus ([navigation.md](navigation.md)). `role="menu"` promises application-style keys that site navigation does not need.
- Choosing a value for a form: use a select ([select-combobox.md](select-combobox.md)).
- One or two actions: show buttons directly.

## States matrix

| State | Requirement |
|---|---|
| closed | `aria-expanded="false"` on the button. |
| open | `aria-expanded="true"`; menu positioned near the button and inside the viewport. |
| focus-visible | The focused item is visibly highlighted (not color alone). |
| disabled item | `aria-disabled="true"`; focusable but does nothing, or skipped consistently. |
| checked item | `menuitemcheckbox`/`menuitemradio` with `aria-checked`. |
| empty | Do not render an empty menu; disable the button and explain. |

## Keyboard map

| Key | Action |
|---|---|
| Enter / Space / ArrowDown on the button | Opens and focuses the first item. |
| ArrowUp on the button | Opens and focuses the last item (optional). |
| ArrowDown / ArrowUp | Next / previous item (wrapping is optional). |
| Home / End | First / last item. |
| Enter / Space on an item | Activates it and closes the menu; focus returns to the button. |
| Escape | Closes; focus returns to the button. |
| Tab | Closes and moves focus on. |
| Type a character | Moves to the next item starting with it (optional). |

## ARIA pattern

- Button: `aria-haspopup="menu"` (or `true`), `aria-expanded`, optionally `aria-controls`.
- Popup: `role="menu"` with items `role="menuitem"` (or `menuitemcheckbox`/`menuitemradio`), `tabindex="-1"`; focus moves between items.
- No other focusable content inside the menu (no plain buttons or inputs).

## Responsive rules

- On narrow screens a bottom sheet is fine; items stay at least 44px tall.
- The menu flips to stay inside the viewport; it never causes horizontal scroll.

## Failure cases

- A list of plain buttons in a popup (fails `menu/item-roles`, `menu/arrows`).
- Opens on hover only; no `aria-expanded` (fails `menu/button`, `menu/opens`).
- Escape closes but focus is lost (fails `menu/escape`).

## Guidance

Group related items, put destructive items last and separated, and confirm destructive actions in a dialog.

## Conformance coverage

| Requirement | Check |
|---|---|
| Button exposes `aria-haspopup` and collapsed state | `menu/button` |
| Enter opens a `menu`, `aria-expanded="true"` | `menu/opens` |
| Focus on first item | `menu/focus-first` |
| Item roles only | `menu/item-roles` |
| ArrowDown moves | `menu/arrows` |
| Home / End | `menu/home-end` |
| Escape closes and returns focus | `menu/escape` |
| No axe-core violations, closed and open | `menu/axe` |

Adapter keys: `trigger` (required), `menu` (popup selector), `region`.
