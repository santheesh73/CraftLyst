# Contract: Navigation (site and app)

Status: v0.5 · Conformance suite: `navigation` · Principles: WAI-ARIA Authoring Practices (landmarks; disclosure navigation menus)

## Purpose

Let users move between the main areas of a site or app and know where they are.

## When not to use

- Actions on the current page: use buttons or a menu button ([menu.md](menu.md)).
- Steps in a flow: use a stepper.

## States matrix

| State | Requirement |
|---|---|
| default | A `nav` landmark containing a list of links. |
| current | `aria-current="page"` on the link for the current page; visible by more than color. |
| hover / focus-visible | Ring on focus; targets at least 44px tall on touch. |
| submenu closed | Disclosure button with `aria-expanded="false"`; submenu hidden. |
| submenu open | `aria-expanded="true"`; submenu links in the Tab order right after the button. |
| collapsed (mobile) | A "Menu" disclosure button that shows the same links. |

## Keyboard map

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves through links and disclosure buttons in order. |
| Enter / Space on a disclosure button | Opens or closes its submenu. |
| Escape | Closes the open submenu and returns focus to its button. |
| Arrow keys | Optional enhancements only; Tab must work. |

## ARIA pattern

- `<nav>` with `aria-label` when the page has more than one navigation landmark.
- Disclosure pattern for submenus: `<button aria-expanded aria-controls>` followed by a list of links.
- Do **not** use `role="menu"`/`"menubar"` for site navigation: it changes how screen readers handle keys and promises application behavior users do not expect.

## Responsive rules

- Below the point where links fit, collapse into a "Menu" disclosure; keep the current page visible.
- Off-canvas panels trap focus only if they are modal (then they follow [dialog.md](dialog.md)).
- No horizontal page scroll from the nav.

## Failure cases

- Links in a `div` with no landmark when several navs exist (fails `navigation/landmark`).
- Current page marked only with a CSS class (fails `navigation/current`).
- Menubar roles on site navigation (fails `navigation/no-menu-roles`).
- Hover-only submenus (fails `navigation/disclosure`).
- Focusable elements hidden from assistive technology inside the nav (axe `aria-hidden-focus`, fails `navigation/axe`).

## Guidance

Keep top-level items few and stable; label them with nouns users recognize.

## Conformance coverage

| Requirement | Check |
|---|---|
| Navigation landmark, named when needed | `navigation/landmark` |
| `aria-current="page"` | `navigation/current` |
| No menu roles | `navigation/no-menu-roles` |
| Disclosure submenu keyboard and state | `navigation/disclosure` |
| No axe-core violations, submenu open and closed | `navigation/axe` |

Adapter keys: `nav` (required), `submenuTrigger`, `expectCurrent` (false when no current page is shown), `region`.
