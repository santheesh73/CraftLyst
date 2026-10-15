# Conformance results: external libraries (P5 gate)

Run on 2026-10-14 in the development container (Linux, Node 22.22.0, Playwright 1.56.1 with
its bundled Chromium, axe-core 4.13.0). The kit, adapters, and demo source are in
[contracts/conformance/](../../contracts/conformance/); rebuild steps are in
[contracts/conformance/targets/README.md](../../contracts/conformance/targets/README.md).

## Summary

| Target | Versions | Pass | Fail | N/A | Exit |
|---|---|---|---|---|---|
| Reference fixture (L1 test fixture) | hand-rolled | 85 | 0 | 0 | 0 |
| Broken fixture (negative control) | hand-rolled | 11 | 68 | 6 | 1 |
| Radix Primitives | react 19.3.0, @radix-ui/react-* (versions below) | 71 | 2 | 12 | 1 |
| React Aria Components | react-aria-components 1.22.1, react 19.3.0 | 75 | 0 | 10 | 0 |

Radix packages: react-accordion 1.3.1, react-dialog 1.3.1, react-dropdown-menu 2.2.1,
react-form 0.3.0, react-navigation-menu 1.4.1, react-popover 1.3.1, react-select 2.4.1,
react-tabs 1.2.1, react-toast 1.3.1, react-toggle 1.2.1, react-tooltip 1.4.1. Bundled with
esbuild 0.28.2. All installed from the npm registry into a scratch directory outside the
repository with `--ignore-scripts`.

Commands (from the repository root, after the install in the targets README):

```sh
node contracts/conformance/targets/build.js --modules <deps>/node_modules
node contracts/conformance/run.js --adapter contracts/conformance/targets/radix/adapter.json
node contracts/conformance/run.js --adapter contracts/conformance/targets/react-aria/adapter.json
node contracts/conformance/run.js --adapter contracts/conformance/fixtures/reference/adapter.json
node contracts/conformance/run.js --adapter contracts/conformance/fixtures/broken/adapter.json
```

Each run was repeated (React Aria three times in a row) with identical summaries.

## What the failures are

| Target | Check | Verdict | Investigation |
|---|---|---|---|
| Radix | `text-field/invalid` | **Library behavior** | `@radix-ui/react-form` 0.3.0 sets `data-invalid` for client-side validation but sets `aria-invalid` only for `serverInvalid` (seen in its `dist/index.mjs`). The error message is linked with `aria-describedby` (`text-field/error-described` passes). The browser's native constraint-validation state may be exposed to assistive technology, but the kit does not verify that; under this contract it is a failure. |
| Radix | `navigation/axe` | **Library behavior (axe finding)** | With the submenu open, NavigationMenu renders a focus-proxy `<span aria-hidden="true" tabindex="0">`; axe-core reports `aria-hidden-focus` (serious). Real axe finding; its practical impact on screen-reader users was not tested. |

Kit bugs found and fixed during these runs (not counted above):

1. **Tooltip on programmatic focus.** Both libraries showed tooltips on a real Tab press but not on script `focus()`. The kit now reaches the trigger with a real Tab (`tabTo`), as a keyboard user would.
2. **Roving tabindex.** Radix Tabs sets the selected tab's `tabindex` lazily and puts `tabindex="0"` on the tablist, so counting `tabIndex` reported zero tab stops. The check now measures the actual Tab sequence.
3. **Toast live region.** Radix announces through a status element it inserts empty and fills a moment later. The check now watches live regions with a MutationObserver instead of comparing before/after snapshots.
4. **Modal semantics.** Neither library sets `aria-modal`; both mark everything outside the dialog `aria-hidden`. The contract now accepts that technique, and the evidence says so ("passes via hidden background, not aria-modal"). Under an `aria-modal`-only rule both would fail `dialog/modal`.
5. **Escape swallowed by a closing tooltip.** React Aria's open tooltip handles Escape in the capture phase; the hover check left a tooltip closing when the popover check pressed Escape. The kit now waits for the tooltip to close.
6. **Button activation.** React Aria's `usePress` runs `onPress` on Enter and Space without dispatching a DOM `click`, so click counting saw nothing. Adapters may now name an `activationSignal`; the React Aria demo shows a press counter.

Demo-page bug fixed: the Radix text field first passed its own `id` to `Form.Control`, which broke the label association (`text-field/name` failed). Not a library issue.

## Not applicable

| Target | Component or check | Reason |
|---|---|---|
| Radix | table, pagination | No primitive in Radix. |
| Radix | button (plain) | No Button primitive; the button contract ran on `@radix-ui/react-toggle`, which is a button with `aria-pressed`. |
| Radix | `alert/role` | No static alert primitive; the demo declares none. |
| React Aria | pagination, navigation | No such components (it has Link and Breadcrumbs). |
| React Aria | `alert/role` | No static alert component; the demo declares none. |
| React Aria | toast | Tested, but it is exported as `UNSTABLE_*` in 1.22.1. |

## Limits

- One demo page per library, one instance per component, Chromium only, no screen reader.
  A pass means the automated checks passed, not that the component is fully accessible.
- The demo pages were written for this kit; another composition of the same primitives
  can behave differently.
- shadcn/ui (built on Radix) and MUI were not run: **not verified**.

## Full results

### radix-primitives

- Kit: frontend-craft conformance 0.2.0
- Library: Radix Primitives see packages (react@19.3.0, react-dom@19.3.0, @radix-ui/react-accordion@1.3.1, @radix-ui/react-dialog@1.3.1, @radix-ui/react-dropdown-menu@2.2.1, @radix-ui/react-form@0.3.0, @radix-ui/react-navigation-menu@1.4.1, @radix-ui/react-popover@1.3.1, @radix-ui/react-select@2.4.1, @radix-ui/react-tabs@1.2.1, @radix-ui/react-toast@1.3.1, @radix-ui/react-toggle@1.2.1, @radix-ui/react-tooltip@1.4.1)
- Trust: external library under test (demo page written for this kit)
- Summary: 71 pass, 2 fail, 12 not applicable

#### button

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `button/role` | PASS | computed role: button |
| `button/name` | PASS | accessible name "Bold" |
| `button/focusable` | PASS | focus() lands on the button |
| `button/enter` | PASS | click events: "0" -> "1" after Enter |
| `button/space` | PASS | click events: "1" -> "2" after Space |
| `button/toggle-state` | PASS | aria-pressed false -> true after Space |
| `button/disabled` | PASS | disabled=true, aria-disabled=null |
| `button/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-button |

#### text-field

4 pass, 1 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `text-field/name` | PASS | accessible name "Email address" |
| `text-field/required` | PASS | required=true, aria-required=null |
| `text-field/invalid` | FAIL | aria-invalid=null after entering "not-an-email" and submitting |
| `text-field/error-described` | PASS | aria-describedby -> radix-_r_s_: "Enter an email address like name@example.com." |
| `text-field/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-text-field |

#### select-combobox

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `select/role` | PASS | computed role: combobox, aria-haspopup=null |
| `select/name` | PASS | accessible name "Fruit Apple" |
| `select/expanded` | PASS | aria-expanded false -> true after ArrowDown; popup visible |
| `select/listbox` | PASS | listbox with 3 option(s) |
| `select/controls` | PASS | aria-controls=radix-_r_5_ (exists) |
| `select/arrow-moves` | PASS | active option "Apple" -> "Banana" (option) |
| `select/enter-selects` | PASS | popup closed; trigger shows "Banana", expected "Banana" |
| `select/escape-closes` | PASS | popup closed; focus on button#rx-select[role=combobox] "Banana" |
| `select/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-select |

#### dialog

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `dialog/opens` | PASS | dialog visible after Enter on the trigger |
| `dialog/role` | PASS | <div> role=dialog |
| `dialog/modal` | PASS | aria-modal=null, :modal=false, background hidden: 4/4 body children aria-hidden or inert (passes via hidden background, not aria-modal) |
| `dialog/name` | PASS | accessible name "Rename project" |
| `dialog/initial-focus` | PASS | focus on input#rx-name |
| `dialog/focus-trap` | PASS | 5 Tab and 5 Shift+Tab presses stayed inside (3 focusable) |
| `dialog/escape` | PASS | dialog hidden after Escape |
| `dialog/return-focus` | PASS | focus on button#rx-dialog-open "Rename project" |
| `dialog/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in [role="dialog"], [role="alertdialog"], dialog[open] |

#### menu

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `menu/button` | PASS | aria-haspopup=menu, aria-expanded=false |
| `menu/opens` | PASS | menu visible; aria-expanded=true |
| `menu/focus-first` | PASS | focus on div[role=menuitem] "Duplicate" |
| `menu/item-roles` | PASS | 3 menu item(s); 0 focusable element(s) without a menuitem role |
| `menu/arrows` | PASS | after ArrowDown focus on div[role=menuitem] "Archive" |
| `menu/home-end` | PASS | End -> div[role=menuitem] "Delete"; Home -> div[role=menuitem] "Duplicate" |
| `menu/escape` | PASS | menu closed; focus on button#rx-menu-btn "Actions"; aria-expanded=false |
| `menu/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-menu |

#### tabs

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `tabs/roles` | PASS | role=tablist, 3 tab(s) |
| `tabs/selected` | PASS | 1 tab(s) with aria-selected="true" |
| `tabs/controls` | PASS | aria-controls=radix-_r_b_-content-plan |
| `tabs/panel-name` | PASS | tabpanel name "Plan" |
| `tabs/roving-tabindex` | PASS | Tab into the tablist -> button#radix-_r_b_-trigger-plan[role=tab] "Plan"; next Tab -> div#radix-_r_b_-content-plan[role=tabpanel] "You are on the monthly plan." |
| `tabs/arrows` | PASS | ArrowRight -> button#radix-_r_b_-trigger-invoices[role=tab] "Invoices"; ArrowLeft -> button#radix-_r_b_-trigger-plan[role=tab] "Plan" |
| `tabs/wrap` | PASS | ArrowRight on the last tab -> button#radix-_r_b_-trigger-plan[role=tab] "Plan" |
| `tabs/home-end` | PASS | End -> button#radix-_r_b_-trigger-payment[role=tab] "Payment"; Home -> button#radix-_r_b_-trigger-plan[role=tab] "Plan" |
| `tabs/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-tabs |

#### tooltip-popover

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `tooltip/focus` | PASS | tooltip visible: "Copies the share link" |
| `tooltip/described-by` | PASS | aria-describedby -> "Copies the share link" |
| `tooltip/escape` | PASS | tooltip hidden; focus on button#rx-tip-btn "Copy link" |
| `tooltip/hover` | PASS | tooltip visible on hover |
| `popover/expanded` | PASS | aria-expanded false -> true; popover visible |
| `popover/controls` | PASS | aria-controls=radix-_r_g_ (exists) |
| `popover/escape` | PASS | popover closed; focus on button#rx-pop-btn "Filters" |
| `tooltip-popover/axe` | PASS | axe-core WCAG 2.x A/AA: no violations (region, open tooltip, open popover) |

#### accordion-disclosure

7 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `accordion/button` | PASS | roles: button, button, button |
| `accordion/expanded` | PASS | aria-expanded: true, false, false |
| `accordion/controls` | PASS | 1/3 triggers reference existing panels |
| `accordion/enter` | PASS | trigger 2: aria-expanded=true, panel visible=true |
| `accordion/space` | PASS | trigger 3: aria-expanded false -> true after Space |
| `accordion/collapsed-hidden` | PASS | every collapsed panel is hidden or not rendered |
| `accordion/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-accordion |

#### toast-alert

5 pass, 0 fail, 1 n/a

| Check | Result | Evidence |
|---|---|---|
| `toast/live-region` | PASS | message landed in role=status; region was in the DOM before the message (first seen with "") |
| `toast/announced` | PASS | live region text: "Notification Settings saved." |
| `toast/focus-kept` | PASS | focus on button#rx-toast-btn "Save settings" |
| `toast/dismiss-name` | PASS | button name(s): "Dismiss notification" |
| `alert/role` | N/A | adapter declares no static alert |
| `toast-alert/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-toast, li.toast |

#### table (not applicable)

Radix Primitives has no table primitive.

#### pagination (not applicable)

Radix Primitives has no pagination primitive.

#### navigation

4 pass, 1 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `navigation/landmark` | PASS | role=navigation, name "Main", 1 navigation landmark(s) on the page |
| `navigation/current` | PASS | 1 link(s) with aria-current="page" |
| `navigation/no-menu-roles` | PASS | 0 element(s) with role menu/menubar |
| `navigation/disclosure` | PASS | aria-expanded false -> true (Enter) -> false (Escape); focus on button#rx-nav-more "More" |
| `navigation/axe` | FAIL | axe-core (submenu open): aria-hidden-focus (serious) at span[aria-hidden="true"] |

### react-aria-components

- Kit: frontend-craft conformance 0.2.0
- Library: React Aria Components 1.22.1 (react@19.3.0, react-dom@19.3.0, react-aria-components@1.22.1)
- Trust: external library under test (demo page written for this kit)
- Summary: 75 pass, 0 fail, 10 not applicable

#### button

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `button/role` | PASS | computed role: button |
| `button/name` | PASS | accessible name "Save draft" |
| `button/focusable` | PASS | focus() lands on the button |
| `button/enter` | PASS | text of .ra-presses: "0" -> "1" after Enter |
| `button/space` | PASS | text of .ra-presses: "1" -> "2" after Space |
| `button/toggle-state` | PASS | aria-pressed false -> true after Space |
| `button/disabled` | PASS | disabled=true, aria-disabled=null |
| `button/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-button |

#### text-field

5 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `text-field/name` | PASS | accessible name "Email address" |
| `text-field/required` | PASS | required=true, aria-required=null |
| `text-field/invalid` | PASS | aria-invalid=true after entering "not-an-email" and submitting |
| `text-field/error-described` | PASS | aria-describedby -> react-aria5055026510-_r_7_ react-aria5055026510-_r_8_: "We only use this for receipts. Please include an '@' in the email address. 'not-" |
| `text-field/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-text-field |

#### select-combobox

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `select/role` | PASS | computed role: button, aria-haspopup=listbox |
| `select/name` | PASS | accessible name "Apple Fruit" |
| `select/expanded` | PASS | aria-expanded false -> true after ArrowDown; popup visible |
| `select/listbox` | PASS | listbox with 3 option(s) |
| `select/controls` | PASS | aria-controls=react-aria2393563152-_r_c_ (exists) |
| `select/arrow-moves` | PASS | active option "Apple" -> "Banana" (option) |
| `select/enter-selects` | PASS | popup closed; trigger shows "Banana", expected "Banana" |
| `select/escape-closes` | PASS | popup closed; focus on button#react-aria2393563152-_r_d_ "Banana" |
| `select/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-select |

#### dialog

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `dialog/opens` | PASS | dialog visible after Enter on the trigger |
| `dialog/role` | PASS | <section> role=dialog |
| `dialog/modal` | PASS | aria-modal=null, :modal=false, background hidden: 4/4 body children aria-hidden or inert (passes via hidden background, not aria-modal) |
| `dialog/name` | PASS | accessible name "Rename project" |
| `dialog/initial-focus` | PASS | focus on input#react-aria2302295452-_r_2s_ |
| `dialog/focus-trap` | PASS | 5 Tab and 5 Shift+Tab presses stayed inside (3 focusable) |
| `dialog/escape` | PASS | dialog hidden after Escape |
| `dialog/return-focus` | PASS | focus on button#react-aria2302295452-_r_m_ "Rename project" |
| `dialog/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in [role="dialog"], [role="alertdialog"], dialog[open] |

#### menu

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `menu/button` | PASS | aria-haspopup=true, aria-expanded=false |
| `menu/opens` | PASS | menu visible; aria-expanded=true |
| `menu/focus-first` | PASS | focus on div#react-aria5190374825-_r_30_[role=menuitem] "Duplicate" |
| `menu/item-roles` | PASS | 3 menu item(s); 0 focusable element(s) without a menuitem role |
| `menu/arrows` | PASS | after ArrowDown focus on div#react-aria5190374825-_r_34_[role=menuitem] "Archive" |
| `menu/home-end` | PASS | End -> div#react-aria5190374825-_r_38_[role=menuitem] "Delete"; Home -> div#react-aria5190374825-_r_30_[role=menuitem] "Duplicate" |
| `menu/escape` | PASS | menu closed; focus on button#react-aria5190374825-_r_p_ "Actions"; aria-expanded=false |
| `menu/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-menu |

#### tabs

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `tabs/roles` | PASS | role=tablist, 3 tab(s) |
| `tabs/selected` | PASS | 1 tab(s) with aria-selected="true" |
| `tabs/controls` | PASS | aria-controls=react-aria8051246308-_r_u_-tabpanel-plan |
| `tabs/panel-name` | PASS | tabpanel name "Plan" |
| `tabs/roving-tabindex` | PASS | Tab into the tablist -> div#react-aria8051246308-_r_u_-tab-plan[role=tab] "Plan"; next Tab -> div#react-aria8051246308-_r_u_-tabpanel-plan[role=tabpanel] "You are on the monthly plan." |
| `tabs/arrows` | PASS | ArrowRight -> div#react-aria8051246308-_r_u_-tab-invoices[role=tab] "Invoices"; ArrowLeft -> div#react-aria8051246308-_r_u_-tab-plan[role=tab] "Plan" |
| `tabs/wrap` | PASS | ArrowRight on the last tab -> div#react-aria8051246308-_r_u_-tab-plan[role=tab] "Plan" |
| `tabs/home-end` | PASS | End -> div#react-aria8051246308-_r_u_-tab-payment[role=tab] "Payment"; Home -> div#react-aria8051246308-_r_u_-tab-plan[role=tab] "Plan" |
| `tabs/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-tabs |

#### tooltip-popover

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `tooltip/focus` | PASS | tooltip visible: "Copies the share link" |
| `tooltip/described-by` | PASS | aria-describedby -> "Copies the share link" |
| `tooltip/escape` | PASS | tooltip hidden; focus on button#react-aria9182828727-_r_11_ "Copy link" |
| `tooltip/hover` | PASS | tooltip visible on hover |
| `popover/expanded` | PASS | aria-expanded false -> true; popover visible |
| `popover/controls` | PASS | aria-controls=react-aria9182828727-_r_13_ (exists) |
| `popover/escape` | PASS | popover closed; focus on button#react-aria9182828727-_r_14_ "Filters" |
| `tooltip-popover/axe` | PASS | axe-core WCAG 2.x A/AA: no violations (region, open tooltip, open popover) |

#### accordion-disclosure

7 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `accordion/button` | PASS | roles: button, button, button |
| `accordion/expanded` | PASS | aria-expanded: true, false, false |
| `accordion/controls` | PASS | 3/3 triggers reference existing panels |
| `accordion/enter` | PASS | trigger 2: aria-expanded=true, panel visible=true |
| `accordion/space` | PASS | trigger 3: aria-expanded false -> true after Space |
| `accordion/collapsed-hidden` | PASS | every collapsed panel is hidden or not rendered |
| `accordion/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-accordion |

#### toast-alert

5 pass, 0 fail, 1 n/a

| Check | Result | Evidence |
|---|---|---|
| `toast/live-region` | PASS | message landed in role=alert; region was inserted together with the message |
| `toast/announced` | PASS | live region text: "Settings saved." |
| `toast/focus-kept` | PASS | focus on button#react-aria4740561300-_r_1m_ "Save settings" |
| `toast/dismiss-name` | PASS | button name(s): "Dismiss notification" |
| `alert/role` | N/A | adapter declares no static alert |
| `toast-alert/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-toast, .toast |

#### table

7 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `table/semantics` | PASS | role=grid, 2 header cell(s), 5 row(s) |
| `table/sort-button` | PASS | role=columnheader, name "Name", inside a column header: true |
| `table/sort-state` | PASS | aria-sort none -> ascending -> descending over two Enter presses |
| `table/sort-order` | PASS | first row: "NameRole" -> "NameRole" -> "NameRole" |
| `table/filter-name` | PASS | accessible name "Filter by name" |
| `table/filter-works` | PASS | visible rows 5 -> 2 after typing "ar" |
| `table/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-table |

#### pagination (not applicable)

React Aria Components has no pagination component.

#### navigation (not applicable)

React Aria Components has no site-navigation component (it has Link and Breadcrumbs).
