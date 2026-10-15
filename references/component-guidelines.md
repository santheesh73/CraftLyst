# Component guidelines

How to build or adapt components so they are functional, accessible, and consistent.
Frontend Craft ships component *contracts* (specs plus a conformance kit, v0.5), not a
competing UI kit: [contracts/](../contracts/README.md). Prefer the project's existing components and established libraries.

## Contents

1. [Reuse order](#1-reuse-order)
2. [The states matrix](#2-the-states-matrix)
3. [API design](#3-api-design)
4. [Contract summaries](#4-contract-summaries)
5. [Forms](#5-forms)
6. [Feedback and status](#6-feedback-and-status)
7. [Data display](#7-data-display)

## 1. Reuse order

1. A component that already exists in the project (search before creating).
2. The project's design-system library (shadcn/ui, Radix, MUI, React Aria, Headless UI,
   Bits UI, or similar) if already installed.
3. A headless or accessible primitive library, only if adding a dependency is justified
   and the user agrees.
4. Hand-rolled, following the contract and the ARIA Authoring Practices pattern.

Never add a second component library alongside an existing one without being asked.

## 2. The states matrix

Every interactive component defines and styles these, or documents why one does not apply:

| State | Notes |
|---|---|
| default | |
| hover | pointer devices only (`@media (hover: hover)`); never the only cue |
| focus-visible | visible ring from the `focus` token; 3:1 against adjacent colors |
| active / pressed | `aria-pressed` for toggles |
| disabled | prefer explaining why; avoid disabling submit without a message |
| loading | keep size stable; announce politely; prevent double submit |
| error | message text, not only red; linked with `aria-describedby` |
| empty | for containers and lists: explain and offer the next action |
| success | confirm the outcome; do not leave the user guessing |

Data components also need: zero, one, many, and very many items; very long strings; RTL.

## 3. API design

- Match the project's conventions (prop names, composition style, styling approach).
- Typed props where the stack supports it (TypeScript or JSDoc).
- Composition over configuration: slots or children beat 20 boolean props.
- Forward refs and spread remaining props to the root element so consumers keep control.
- Variants map to tokens (`variant="danger"` uses `color.danger`), never to literal values.
- Controlled and uncontrolled modes for inputs where the project expects both.

## 4. Contract summaries

Keyboard and ARIA essentials. Full contracts (states, keyboard map, failure cases) are in
[contracts/components/](../contracts/README.md); check any implementation with
`node <skill>/contracts/conformance/run.js --adapter <adapter.json>` (needs Playwright).

- **Button**: native `button`; `type="button"` unless submitting; Enter and Space activate;
  icon-only needs an accessible name.
- **Text field**: visible `label` tied by `for`/`id`; hint and error via `aria-describedby`;
  `aria-invalid` on error; correct `type`, `inputmode`, and `autocomplete`.
- **Select / combobox**: native `select` when possible; custom combobox follows the APG
  combobox pattern (arrow keys, Enter, Escape, typeahead, `aria-activedescendant` or roving focus).
- **Dialog**: native `dialog` with `showModal()` or an equivalent; focus moves in and is
  trapped; Escape closes; focus returns to the trigger; labelled by its heading.
- **Menu**: menu button pattern; arrow keys move, Escape closes, focus returns. Navigation
  links are not a `menu` role.
- **Tabs**: `tablist`/`tab`/`tabpanel`; arrow keys move between tabs; one tab in the tab order.
- **Tooltip / popover**: tooltips are supplementary text on hover and focus, dismissible
  with Escape, never containing interactive content. Use a popover or dialog for content
  that must be interacted with.
- **Accordion / disclosure**: `button` with `aria-expanded` controlling a region; native
  `details`/`summary` is fine.
- **Toast / alert**: `role="status"` (polite) for confirmations, `role="alert"` for urgent
  errors only; do not auto-dismiss content the user must act on; pause on hover and focus.
- **Table**: real `table` markup with `th` and `scope`; sortable headers are buttons with
  `aria-sort`; filters labelled; horizontal scroll inside a focusable, labelled region on small screens.
- **Pagination**: `nav` with a label; current page marked `aria-current="page"`.
- **Navigation**: `nav` landmark with a label; current item `aria-current`; skip link to `main`.

## 5. Forms

- One column for most forms; group related fields with `fieldset` and `legend`.
- Mark optional fields rather than required ones when most are required, or vice versa;
  be consistent.
- Validate on blur and submit; on submit with errors, move focus to an error summary that
  links to each field.
- Error messages say what is wrong and how to fix it, in plain words.
- Never clear the user's input on error.

## 6. Feedback and status

- Every async action shows pending, success, and failure states.
- Skeletons for content whose layout is known; spinners for short unknown waits; progress
  bars for long, measurable work.
- Optimistic UI only when the action almost always succeeds and can be rolled back visibly.

## 7. Data display

- Tables for comparison, lists for scanning, cards for visual objects.
- Right-align numbers, use tabular figures, show units, and format with the user's locale
  (`Intl.NumberFormat`, `Intl.DateTimeFormat`).
- Truncate with care: full value available on focus or hover and to assistive technology.
