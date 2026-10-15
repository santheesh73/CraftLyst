# Contract: Toast and alert

Status: v0.5 · Conformance suite: `toast-alert` · Principles: WAI-ARIA Authoring Practices (alert pattern), WCAG 2.2 (4.1.3 status messages, 2.2.1 timing)

## Purpose

- **Toast**: a brief, non-blocking status message after an action ("Settings saved").
- **Alert**: an important inline message that is part of the page (trial ending, form error summary).

## When not to use

- Errors the user must fix: show them next to the field and in a summary, not only in a toast that disappears.
- Decisions: use a dialog.
- Marketing or promotions in an alert role.

## States matrix

| State | Requirement |
|---|---|
| idle | The live region container is already in the DOM (empty). |
| shown | Text is inserted into the live region; focus stays where it was. |
| hover / focus within | The timer pauses while the pointer or focus is inside. |
| dismissed | Close button with an accessible name; Escape may dismiss when focus is inside. |
| error | Use `role="alert"` (assertive) sparingly; polite `role="status"` for success and info. |
| success | Polite status; never color alone. |

## Keyboard map

| Key | Action |
|---|---|
| (none) | Showing a toast does not move focus. |
| Tab | Reaches toast actions if the toast has any (or provide another path to the same action). |
| Escape | Dismisses when focus is inside the toast (optional). |

## ARIA pattern

- A container with `role="status"` (or `aria-live="polite"`) present before messages arrive; messages are inserted into it.
- `role="alert"` for urgent messages; it may be inserted together with its text.
- Toasts with actions need a persistent alternative (an undo link elsewhere, or no timeout).
- Timeouts long enough to read (at least about 5 seconds plus reading time), or no timeout for messages with actions.

## Responsive rules

- Toasts do not cover primary actions or the on-screen keyboard; stack vertically; full-width on narrow screens.
- Respect reduced motion for entrance and exit.

## Failure cases

- A div appended to the body with no live region (fails `toast/announced`).
- Live region created together with its text (not reliably announced; fails `toast/live-region` unless `role="alert"`).
- Toast that steals focus (fails `toast/focus-kept`).
- Icon-only close button with no name (fails `toast/dismiss-name`).

## Guidance

One message per event; merge repeats. Say what happened and what (if anything) to do next.

## Conformance coverage

| Requirement | Check |
|---|---|
| Live region exists before the message (or inserted `role=alert`) | `toast/live-region` |
| Message reaches a live region | `toast/announced` |
| Focus not moved | `toast/focus-kept` |
| Dismiss control named | `toast/dismiss-name` |
| Static alert role | `alert/role` |
| No axe-core violations with the toast showing | `toast-alert/axe` |

Adapter keys: `trigger` (button that causes a toast), `toast` (selector of the visible toast), `alert` (static alert), `region`.
