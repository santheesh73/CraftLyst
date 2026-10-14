# Contract: Tooltip and popover

Status: v0.5 · Conformance suite: `tooltip-popover` · Principles: WAI-ARIA Authoring Practices (tooltip pattern; disclosure for popovers), WCAG 2.2 (1.4.13)

## Purpose

- **Tooltip**: a short, non-interactive description of a control, shown on hover and keyboard focus.
- **Popover**: a non-modal panel with interactive content (filters, a small form) opened by a button.

## When not to use

- Essential information or instructions: put them on the page. Touch users rarely see tooltips.
- Anything interactive in a tooltip: use a popover.
- Blocking decisions: use a dialog ([dialog.md](dialog.md)).

## States matrix

| State | Tooltip | Popover |
|---|---|---|
| hidden | Not visible; may stay in the DOM as the description target. | `aria-expanded="false"`. |
| hover | Shows after a short delay; hovering the tooltip itself keeps it open (WCAG 1.4.13). | Optional preview only. |
| focus-visible | Shows when the trigger gets keyboard focus. | Ring on the trigger. |
| open | Dismissible with Escape without moving focus. | `aria-expanded="true"`; focus moves into the popover or stays on the trigger with clear next step. |
| disabled | Disabled triggers still need a way to explain why (a wrapper or visible text). | Trigger disabled. |

## Keyboard map

| Key | Tooltip | Popover |
|---|---|---|
| Tab onto trigger | Shows the tooltip | — |
| Escape | Hides it; focus stays | Closes; focus returns to the trigger |
| Enter / Space on trigger | Activates the control (tooltip hides) | Opens / closes |
| Tab inside | — | Moves through the popover's controls; leaving may close it |

## ARIA pattern

- Tooltip: `role="tooltip"`; the trigger's `aria-describedby` references it (the name comes from the trigger's own label).
- Popover: trigger with `aria-expanded` and preferably `aria-controls`; panel is a `role="dialog"` (non-modal) with a name, or a region. The native `popover` attribute is acceptable.

## Responsive rules

- Tooltips must not be the only way to get information on touch devices.
- Popovers flip or become a bottom sheet to stay in the viewport.

## Failure cases

- `title` attribute as the tooltip (not shown on focus or touch; fails `tooltip/focus`).
- Tooltip that does not hide on Escape (fails `tooltip/escape`).
- Popover with no expanded state or focus return (fails `popover/expanded`, `popover/escape`).

## Guidance

Tooltips are a few words. If you need a sentence with a link, use a popover or inline help text.

## Conformance coverage

| Requirement | Check |
|---|---|
| Keyboard focus shows a tooltip | `tooltip/focus` |
| Trigger described by the tooltip | `tooltip/described-by` |
| Escape hides without moving focus | `tooltip/escape` |
| Hover shows | `tooltip/hover` |
| Popover expanded state | `popover/expanded` |
| `aria-controls` target exists | `popover/controls` |
| Escape closes, focus returns | `popover/escape` |
| No axe-core violations, open and closed | `tooltip-popover/axe` |

The kit reaches the tooltip trigger with a real Tab press (some libraries show tooltips for keyboard focus only, not for script `focus()`).
Adapter keys: `tooltipTrigger`, `tooltip`, `popoverTrigger`, `popover`, `region`.
