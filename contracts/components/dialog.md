# Contract: Dialog (modal)

Status: v0.5 · Conformance suite: `dialog` · Principles: WAI-ARIA Authoring Practices (modal dialog pattern), WCAG 2.2 (2.1.2, 2.4.3)

## Purpose

Interrupts the page for a short, focused task or decision (confirm, rename, small form). Everything behind it is inert until it closes.

## When not to use

- Long or multi-step flows: use a page or a route.
- Non-blocking information: use a toast ([toast-alert.md](toast-alert.md)) or inline message.
- Content the user needs to compare with the page behind: use a non-modal panel or popover.

## States matrix

| State | Requirement |
|---|---|
| closed | Not rendered or hidden from everyone (`hidden`/`display:none`). |
| opening | Focus moves inside (first field, or the least destructive action). Motion respects reduced motion. |
| open | Background inert; title visible; close control present. |
| loading | Actions show progress; the dialog does not close until the work finishes or fails. |
| error | Error inside the dialog, focus moved to it or to the field. |
| closing | Focus returns to the element that opened it (or a logical successor if it is gone). |

## Keyboard map

| Key | Action |
|---|---|
| Tab / Shift+Tab | Cycle through focusable elements inside the dialog only. |
| Escape | Closes (unless closing would lose data; then confirm). |
| Enter | Activates the focused control (no implicit "OK" on Enter from any field). |

## ARIA pattern

- `role="dialog"` (or `alertdialog` for urgent confirmations) or a native `<dialog>` opened with `showModal()`.
- Modal semantics: `aria-modal="true"`, native `:modal`, or (older technique, accepted by the kit) every element outside the dialog `aria-hidden="true"` or `inert`.
- Name: `aria-labelledby` the visible title; optional `aria-describedby` the description.
- Focus trap and focus return are part of the contract, not optional polish.

## Responsive rules

- Below about 480px the dialog may become full-screen or a bottom sheet; the same keyboard and focus rules apply.
- Content scrolls inside the dialog, never the page behind.
- Max width respects `100vw - gutters`; no horizontal scroll.

## Failure cases

- A styled `div` overlay with no role or name (fails `dialog/role`, `dialog/name`).
- Tab escapes to the page behind (fails `dialog/focus-trap`).
- Escape does nothing (fails `dialog/escape`).
- Focus lands on the body after closing (fails `dialog/return-focus`).

## Guidance

Title says what the dialog is for; buttons say what they do ("Delete project", not "OK"). One primary action.

## Conformance coverage

| Requirement | Check |
|---|---|
| Opens from the keyboard | `dialog/opens` |
| Dialog role | `dialog/role` |
| Modal semantics | `dialog/modal` |
| Accessible name | `dialog/name` |
| Focus moves inside | `dialog/initial-focus` |
| Focus trapped | `dialog/focus-trap` |
| Escape closes | `dialog/escape` |
| Focus returns to trigger | `dialog/return-focus` |
| No axe-core violations while open | `dialog/axe` |

Adapter keys: `trigger` (required), `dialog` (selector; default role or native dialog lookup).
