# Contract: Tabs

Status: v0.5 · Conformance suite: `tabs` · Principles: WAI-ARIA Authoring Practices (tabs pattern)

## Purpose

Switch between peer views of the same object (Plan, Invoices, Payment) without leaving the page. Only one panel shows at a time.

## When not to use

- Steps in a sequence: use a stepper or separate pages.
- Navigation between pages: use links in a `nav` (with `aria-current`), even if styled as tabs.
- Content users need to compare side by side.

## States matrix

| State | Requirement |
|---|---|
| default | One selected tab, visually distinct by more than color. |
| hover | Pointer only. |
| focus-visible | Ring on the focused tab; the panel can also be focusable when it has no focusable content. |
| selected | `aria-selected="true"`; its panel visible. |
| disabled | `aria-disabled="true"`; skipped or announced. |
| loading | The panel shows progress; the tab list stays usable. |
| empty | The panel explains why it is empty. |

## Keyboard map

| Key | Action |
|---|---|
| Tab | Enters the tab list on the selected tab; the next Tab moves into the panel or past it. |
| ArrowRight / ArrowLeft | Next / previous tab, wrapping at the ends (ArrowDown/Up for vertical lists). |
| Home / End | First / last tab. |
| Enter / Space | Selects the focused tab when activation is manual. |

Automatic activation (select on focus) is fine when panels render instantly; use manual activation when switching is slow.

## ARIA pattern

- `role="tablist"` (with a name), children `role="tab"`, panels `role="tabpanel"`.
- Each tab `aria-controls` its panel (at least the selected one must exist); each panel `aria-labelledby` its tab.
- Roving tabindex: one tab stop for the whole list.

## Responsive rules

- Too many tabs for the width: scroll the tab list horizontally inside its own container, or switch to a select; never wrap into a confusing second row.
- Tabs stay at least 44px tall on touch.

## Failure cases

- Buttons that swap content with no tab roles (fails `tabs/roles`).
- Every tab in the Tab sequence (fails `tabs/roving-tabindex`).
- Arrow keys do nothing (fails `tabs/arrows`).

## Guidance

Short, parallel labels. Remember the selected tab in the URL when it represents a view users share.

## Conformance coverage

| Requirement | Check |
|---|---|
| Tablist with tabs | `tabs/roles` |
| Exactly one selected | `tabs/selected` |
| Selected tab controls an existing tabpanel | `tabs/controls` |
| Panel labelled | `tabs/panel-name` |
| One tab stop | `tabs/roving-tabindex` |
| Arrow keys | `tabs/arrows` |
| Wrap at the end | `tabs/wrap` |
| Home / End | `tabs/home-end` |
| No axe-core violations | `tabs/axe` |

Adapter keys: `tablist` (required), `panel`, `region`.
