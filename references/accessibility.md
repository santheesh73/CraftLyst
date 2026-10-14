# Accessibility

Target WCAG 2.2 AA unless the contract says otherwise. Accessibility is part of "done",
not a later pass. Automated checks find only part of the problems; say so when reporting.

## Contents

1. [Structure and semantics](#1-structure-and-semantics)
2. [Keyboard and focus](#2-keyboard-and-focus)
3. [Names, labels, descriptions](#3-names-labels-descriptions)
4. [Color and contrast](#4-color-and-contrast)
5. [Forms](#5-forms)
6. [Dynamic content](#6-dynamic-content)
7. [Media and motion](#7-media-and-motion)
8. [ARIA rules of thumb](#8-aria-rules-of-thumb)
9. [Testing and honest reporting](#9-testing-and-honest-reporting)

## 1. Structure and semantics

- `<html lang="...">` set; `dir` for RTL languages.
- Landmarks: one `main`, labelled `nav` regions, `header`/`footer` where meaningful.
- One `h1` per page; heading levels in order without skips (`a11y/semantics`).
- Native elements first: `button` for actions, `a href` for navigation, `table` for tabular
  data, `ul`/`ol` for lists, `dialog` for dialogs.
- A clickable `div` needs role, `tabindex`, and key handling. Use a `button` instead.
- Page `<title>` is unique and describes the page.

## 2. Keyboard and focus

- Everything operable by mouse is operable by keyboard, in a logical order that follows
  the visual order.
- Never remove focus outlines without a visible replacement (`a11y/focus`):

```css
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
```

- Focus is not obscured by sticky headers or footers (WCAG 2.4.11); use `scroll-padding`.
- Provide a skip link to `main` on pages with repeated navigation.
- Modals trap focus and return it to the trigger on close; Escape closes.
- No keyboard traps; no positive `tabindex` values.

## 3. Names, labels, descriptions

- Images: meaningful `alt`, or `alt=""` for decorative ones (`a11y/alt`). Describe the
  information, not the pixels; complex charts need a text summary or data table.
- Icon-only controls: `aria-label` or visually hidden text. The accessible name contains
  the visible label text when there is one (WCAG 2.5.3).
- Links make sense out of context; avoid repeated "Read more" without context.
- SVG icons that are decorative get `aria-hidden="true"`.

## 4. Color and contrast

- Text 4.5:1, large text 3:1, UI components and graphical objects 3:1 (`a11y/contrast`).
- Never convey information by color alone: add text, icons, or patterns.
- Check both themes, hover and focus states, disabled-looking controls, and text on images.
- Support forced colors: keep real borders on controls; test `forced-colors: active`.

## 5. Forms

- Every input has a programmatic label; placeholder is not a label.
- Group related controls with `fieldset`/`legend` (radio groups, addresses).
- Errors: identified in text, linked with `aria-describedby`, `aria-invalid="true"`, and a
  summary on submit that receives focus.
- Use `autocomplete` tokens for personal data (WCAG 1.3.5). Do not block paste.
- Authentication must not rely on a cognitive test alone; allow password managers (WCAG 3.3.8).
- Do not ask for the same information twice in one process (WCAG 3.3.7).

## 6. Dynamic content

- Status messages use `role="status"` or `aria-live="polite"`; urgent errors `role="alert"`.
- Loading regions: `aria-busy` while updating; announce completion when it matters.
- Route changes in single-page apps move focus to the new page heading or announce the title.
- Infinite scroll offers a way to reach the footer and a "load more" alternative.

## 7. Media and motion

- Captions for video with speech; transcripts for audio.
- Respect `prefers-reduced-motion` (`mot/no-reduced`); provide pause for moving content.
- Targets at least 24×24 px (WCAG 2.5.8), 44×44 px recommended on touch (`a11y/target`).
- Dragging has a single-pointer alternative (WCAG 2.5.7).

## 8. ARIA rules of thumb

- No ARIA is better than wrong ARIA. Prefer native semantics.
- Do not change native semantics (`<button role="heading">`).
- Interactive ARIA widgets must implement the full keyboard pattern from the WAI-ARIA
  Authoring Practices Guide.
- `aria-hidden="true"` never goes on focusable content.

## 9. Testing and honest reporting

- Tier 0: Slop Lint a11y rules and token contrast (static, heuristic where noted).
- Tier 2: axe-core scan, keyboard tab-order walk, focus visibility, forced-colors and
  reduced-motion emulation (`craft shoot`, v0.2).
- Automated tools catch a subset of WCAG issues. Never write "fully accessible" or
  "WCAG compliant" from automated results. Write what ran and what passed, and list
  manual checks for a human (screen reader pass, cognitive review) in the Tier 3 checklist.
