# Contract: Button

Status: v0.5 · Conformance suite: `button` · Principles: WAI-ARIA Authoring Practices (button pattern), WCAG 2.2

## Purpose

Triggers an action in place: submit, save, open, toggle. A button does something; a link goes somewhere.

## When not to use

- Navigation to another URL or route: use a link (`<a href>`), even if it looks like a button.
- Choosing one of several options: use radio buttons, a segmented control built on radios, or a select.
- On/off settings that persist immediately: a switch (`role="switch"`) reads better than a toggle button.

## States matrix

| State | Requirement |
|---|---|
| default | Label states the action as a verb ("Save draft", not "OK"). |
| hover | Pointer only (`@media (hover: hover)`); never the only cue that it is interactive. |
| focus-visible | Visible ring from the `focus` token, 3:1 against adjacent colors. |
| active / pressed | Momentary press feedback; a toggle shows its persistent pressed state and exposes `aria-pressed`. |
| disabled | `disabled` (removed from Tab order) or `aria-disabled="true"` (stays focusable so it can explain why). Say why nearby. |
| loading | Keep width stable, keep the label or add a visible progress cue, block double submit, announce completion politely. |
| error | The action failed: say so in text near the button or in a toast; do not just shake it. |
| success | Confirm the outcome (text, toast, or the next view). |

## Keyboard map

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the button. |
| Enter | Activates. |
| Space | Activates (on key up for native buttons). |

## ARIA pattern

- Prefer native `<button type="button">` (or `type="submit"` in a form). It brings role, focus, and both keys for free.
- A non-button element needs `role="button"`, `tabindex="0"`, and handlers for Enter and Space; avoid this.
- Accessible name from visible text; icon-only buttons need `aria-label` (or visually hidden text) and a tooltip is not a substitute.
- Toggle buttons: `aria-pressed="true|false"`; the label does not change when the state changes.
- Menu buttons: see [menu.md](menu.md). Dialog openers: see [dialog.md](dialog.md).

## Responsive rules

- Target at least 24×24 CSS px (WCAG 2.2 minimum); aim for 44×44 on touch.
- Labels wrap or truncate with a full accessible name; never shrink text below the body size.
- Full-width primary buttons are fine on narrow screens; keep the visual order of primary and secondary actions consistent.

## Failure cases

- `<div onclick>` with no role, focus, or key handling (fails `button/role`, `button/enter`).
- Icon-only button with no name (fails `button/name`).
- Disabled look without `disabled`/`aria-disabled` (fails `button/disabled`).
- Toggle that changes its label instead of exposing `aria-pressed` (fails `button/toggle-state`).
- Loading state that resizes the button or allows a second submit.

## Guidance

Use one primary button per view region. Variants map to tokens (`variant="danger"` uses `color.danger`). Put destructive confirmation in a dialog, not in a second click on the same button.

## Conformance coverage

| Requirement | Check |
|---|---|
| Exposed as a button | `button/role` |
| Accessible name | `button/name` |
| Focusable | `button/focusable` |
| Enter activates | `button/enter` |
| Space activates | `button/space` |
| Toggle exposes and flips `aria-pressed` | `button/toggle-state` |
| Disabled exposed | `button/disabled` |
| No axe-core WCAG A/AA violations | `button/axe` |

Not automated: label wording, loading behavior, visual focus ring contrast (use `craft shoot`).
Adapter keys: `button` (required), `toggle`, `disabled`, `region`, `activationSignal` (an element whose text changes when the button's handler runs, for libraries whose keyboard press does not dispatch `click`).
