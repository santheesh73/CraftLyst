# Contract: Text field and validation

Status: v0.5 · Conformance suite: `text-field` · Principles: WAI-ARIA Authoring Practices, WCAG 2.2 (3.3.1, 3.3.2, 1.3.1, 4.1.2)

## Purpose

Collects free text (name, email, search, amount) with a visible label, optional hint, and an error message tied to the field.

## When not to use

- A fixed set of choices: use radios, a select, or a combobox.
- Very long text: use a `<textarea>` (same contract otherwise).
- Dates and numbers with strong structure: consider a dedicated picker, but keep a typed path.

## States matrix

| State | Requirement |
|---|---|
| default | Visible `<label>`; placeholder is an example, never the label. |
| hover | Optional border change; never the only cue. |
| focus-visible | Visible ring; the label stays visible while typing. |
| disabled | `disabled`; prefer read-only (`readonly`) when the value must still be read and copied. |
| loading | For async validation: indicate checking without moving focus. |
| error | `aria-invalid="true"`; message in text, referenced by `aria-describedby` (or `aria-errormessage`); says how to fix it. |
| empty | Required fields expose `required` or `aria-required="true"`; mark required in the visible label too. |
| success | Optional; never rely on green alone. |

## Keyboard map

| Key | Action |
|---|---|
| Tab / Shift+Tab | Enters and leaves the field; error messages are not separate tab stops. |
| Enter | Submits the form (single-line fields). |
| Typing | Never blocked or reformatted under the caret in a way that loses input. |

## ARIA pattern

- `<label for>` (or wrapping label) gives the name; hints and errors join via `aria-describedby="hint-id error-id"`.
- On invalid: `aria-invalid="true"`; remove it (and the error) when the value becomes valid.
- Validate on blur or submit, not on every keystroke for the first entry; on submit, move focus to the first invalid field or to an error summary with links.
- Use the right `type` and `autocomplete` so browsers and password managers help.

## Responsive rules

- Full-width fields on narrow screens; labels above fields (not beside) below about 480px.
- Font size at least 16px on mobile to avoid zoom-on-focus.
- Error text wraps; it never overlaps the next field.

## Failure cases

- Placeholder-only labels (fails `text-field/name`).
- Error shown in red text with no `aria-invalid` (fails `text-field/invalid`).
- Error text not connected to the input (fails `text-field/error-described`).
- Validation that relies on native browser bubbles only: they are not styled, vanish, and some libraries then never set `aria-invalid`.

## Guidance

Write errors as fixes ("Enter an email like name@example.com"), not verdicts ("Invalid"). Keep the user's input on error.

## Conformance coverage

| Requirement | Check |
|---|---|
| Name from a label (not placeholder only) | `text-field/name` |
| Required exposed | `text-field/required` |
| `aria-invalid="true"` after invalid input | `text-field/invalid` |
| Error referenced and has text | `text-field/error-described` |
| No axe-core violations, valid and invalid | `text-field/axe` |

Adapter keys: `input` (required), `required` (true when the field is required), `invalidValue`, `submit` (selector to press Enter on; otherwise the kit tabs out of the field), `region`.
