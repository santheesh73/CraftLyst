# Contract: Select and combobox

Status: v0.5 · Conformance suite: `select-combobox` · Principles: WAI-ARIA Authoring Practices (combobox and listbox patterns)

## Purpose

Choose one value from a list that is too long for radios. A select-only combobox shows the list on demand; an editable combobox also filters as the user types.

## When not to use

- Two to five options that fit: radios are faster and always visible.
- Navigation or actions: use a menu ([menu.md](menu.md)) or links.
- Free text with suggestions only: a text field with a datalist may be enough.

## States matrix

| State | Requirement |
|---|---|
| default | Shows the current value, or a placeholder that is not mistaken for a value. |
| hover | Pointer only. |
| focus-visible | Ring on the trigger; the active option is visibly highlighted (not color alone). |
| open | `aria-expanded="true"`; the listbox is positioned without covering the trigger. |
| disabled | Disabled trigger; disabled options are skipped or announced as disabled. |
| loading | Async options: a status message inside the popup ("Loading..."). |
| empty | "No results" as text in the popup; not an empty box. |
| error | Same as text field: `aria-invalid` and a described error. |

## Keyboard map

| Key | Closed | Open |
|---|---|---|
| ArrowDown / ArrowUp | Opens (on the selected or first option) | Moves the active option |
| Enter / Space | Opens (select-only) | Selects the active option and closes |
| Home / End | — | First / last option |
| Escape | — | Closes without changing the value; focus stays on the trigger |
| Type characters | Jumps to a matching option (select-only) or filters (editable) | Same |
| Tab | Moves on | Closes (optionally commits) and moves on |

## ARIA pattern

- Trigger: `role="combobox"` with `aria-expanded`, `aria-controls` the listbox, and an accessible name; or a button with `aria-haspopup="listbox"`.
- Popup: `role="listbox"` containing `role="option"` with `aria-selected` on the chosen one.
- Active option is either focused (DOM focus moves into the list) or referenced by `aria-activedescendant` on the trigger.
- The native `<select>` is acceptable and often best; it passes by construction except where styling forces a custom one.

## Responsive rules

- On touch screens the native select is usually the better control.
- The popup fits the viewport (flip, or scroll inside); options are at least 44px tall on touch.
- Long option text wraps or truncates with the full text available.

## Failure cases

- `div` trigger with no role (fails `select/role`).
- Opens only on click (fails `select/expanded`).
- Arrow keys scroll the page instead of moving the option (fails `select/arrow-moves`).
- Escape leaves the popup open or loses focus to the body (fails `select/escape-closes`).

## Guidance

Sort options meaningfully (frequency, alphabet). Keep the selected value visible in the trigger after closing.

## Conformance coverage

| Requirement | Check |
|---|---|
| Combobox or listbox button role | `select/role` |
| Accessible name | `select/name` |
| `aria-expanded` false then true, opened by keyboard | `select/expanded` |
| Listbox with options | `select/listbox` |
| `aria-controls` target exists | `select/controls` |
| ArrowDown moves the active option | `select/arrow-moves` |
| Enter selects, closes, shows the value | `select/enter-selects` |
| Escape closes, focus on trigger | `select/escape-closes` |
| No axe-core violations, closed and open | `select/axe` |

Adapter keys: `trigger` (required), `listbox` (selector of the popup if role-based lookup is not enough), `openKey` (default ArrowDown), `region`.
