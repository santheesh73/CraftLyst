# Conformance results: external libraries (P5 gate)

Run on 2026-10-14 in the development container (Linux, Node 22.22.0, Playwright 1.56.1 with
its bundled Chromium, axe-core 4.13.0). The kit, adapters, and demo source are in
[contracts/conformance/](../../contracts/conformance/); rebuild steps are in
[contracts/conformance/targets/README.md](../../contracts/conformance/targets/README.md).

shadcn/ui and MUI were added on 2026-10-15 in the same container (Linux, Node 22.22.0,
Playwright 1.56.1, axe-core 4.13.0) with the kit as it stood that day (it reports itself as
frontend-craft conformance 1.0.0; the Radix and React Aria rows below came from 0.2.0 and
were not re-run). The MUI target was extended on 2026-10-19 (navigation section and a static
alert added, same container and versions) and re-run; its row and full results below are from
that day. Browser engines present in `/opt/pw-browsers`: Chromium only
(`chromium-1194`, `chromium_headless_shell-1194`). **Firefox and WebKit are not installed,
so no result here covers them.**

## Summary

| Target | Versions | Pass | Fail | N/A | Exit |
|---|---|---|---|---|---|
| Reference fixture (L1 test fixture) | hand-rolled | 85 | 0 | 0 | 0 |
| Broken fixture (negative control) | hand-rolled | 11 | 68 | 6 | 1 |
| Radix Primitives | react 19.3.0, @radix-ui/react-* (versions below) | 71 | 2 | 12 | 1 |
| React Aria Components | react-aria-components 1.22.1, react 19.3.0 | 75 | 0 | 10 | 0 |
| MUI (Material UI), 2026-10-19 | @mui/material 9.5.0, @emotion/react 11.14.0, @emotion/styled 11.14.1, react 19.3.0 | 82 | 3 | 0 | 1 |
| shadcn/ui, 2026-10-15 | new-york-v4 registry at shadcn-ui/ui@4233ed1, shadcn CLI 4.21.5, radix-ui 1.8.1, sonner 2.0.8, react 19.3.0 (all below) | 74 | 5 | 6 | 1 |

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

MUI and shadcn/ui (2026-10-15): each final configuration was run three times in a row
(MUI after two demo-page fixes, see below) with identical summaries and exit code 1 each
time. The extended MUI target (2026-10-19) was likewise run three times in a row: 82 pass,
3 fail, 0 not applicable, identical failing checks, exit code 1 each time. shadcn/ui package versions: shadcn CLI 4.21.5, radix-ui 1.8.1, sonner 2.0.8,
next-themes 0.4.6, class-variance-authority 0.7.1, cn 0.4.0, lucide-react 1.57.0,
tailwindcss 4.3.3, @tailwindcss/cli 4.3.3, tw-animate-css 1.4.0, react/react-dom 19.3.0,
esbuild 0.28.2.

How shadcn/ui was set up (no shadcn source is in this repository): `ui.shadcn.com` is
blocked from this container (HTTP 403 at the proxy), so the CLI could not fetch its
registry. The component sources (`apps/v4/registry/new-york-v4/ui/*.tsx` and `lib/utils.ts`)
were downloaded from raw.githubusercontent.com at commit
`4233ed1caded8c38f4bc14b14afe1f93ebcaf966` into a scratch directory, wrapped as local
registry-item JSON files, and installed with the official CLI
(`npx shadcn@4.21.5 add <local items>`, `REGISTRY_URL` pointed at a local mirror of the
same commit's `apps/v4/public/r` for `colors/neutral.json`). The CLI wrote
`src/components/ui/*.jsx` and `src/lib/utils.js` in that scratch project; the theme CSS is
the one in the commit's manual-installation docs, compiled with Tailwind 4.3.3.
`build.js --src` maps the `@/` alias to that directory. The result therefore reflects that
registry commit, not a numbered shadcn release (shadcn/ui components have no package version).

## What the failures are

| Target | Check | Verdict | Investigation |
|---|---|---|---|
| Radix | `text-field/invalid` | **Library behavior** | `@radix-ui/react-form` 0.3.0 sets `data-invalid` for client-side validation but sets `aria-invalid` only for `serverInvalid` (seen in its `dist/index.mjs`). The error message is linked with `aria-describedby` (`text-field/error-described` passes). The browser's native constraint-validation state may be exposed to assistive technology, but the kit does not verify that; under this contract it is a failure. |
| Radix | `navigation/axe` | **Library behavior (axe finding)** | With the submenu open, NavigationMenu renders a focus-proxy `<span aria-hidden="true" tabindex="0">`; axe-core reports `aria-hidden-focus` (serious). Real axe finding; its practical impact on screen-reader users was not tested. |
| MUI | `text-field/invalid` | **Library behavior** | MUI `TextField` sets `aria-invalid` from its `error` prop (it rendered `aria-invalid="false"`); it does not reflect native constraint validation. MUI leaves validation to the app. The demo adds no validation glue. |
| MUI | `tooltip-popover/axe` | **Kit timing (suspected kit bug, reported, not fixed)** | axe reports `color-contrast` on the popover's "Done" button (3.88:1, `#3084d7` on white) only because the popover is still fading in: a probe scanning immediately after Enter reproduces it; the same scan 1 s later has no violation. MUI's primary text color at full opacity passes. The kit scans the popover as soon as it is visible, mid-transition. Re-checked 2026-10-19: once settled, the button's computed color is `rgb(25, 118, 210)` (`#1976d2`) on the paper's `rgb(255, 255, 255)`, 4.60:1, which passes AA. |
| MUI | `navigation/axe` | **Library behavior (MUI default theme, axe finding)** | The site nav is `AppBar color="default"` with default `color="primary"` text Buttons, the composition in MUI's App Bar demos. Computed: text `rgb(25, 118, 210)` (`#1976d2`), 14px, weight 500, on the AppBar's `rgb(245, 245, 245)` (`#f5f5f5`, `grey[100]`): 4.22:1, below AA's 4.5:1 for normal text. A standalone axe scan of the fresh page flags all three controls (Home, Pricing, More) at 4.22:1; in the kit's run only the two links are listed, because after the disclosure check the closing menu still overlaps More and axe marks its background "could not be determined" (incomplete, not a violation). Kept as found; the demo does not change MUI's colors. |
| shadcn/ui | `text-field/invalid`, `text-field/error-described` | **Library behavior** | shadcn `Input` is a styled `<input>`; invalid state and error-message wiring are left to the app (its docs show react-hook-form with `aria-invalid` passed by hand). The demo adds no validation glue. |
| shadcn/ui | `dialog/modal` | **Kit bug (reported, not fixed)** | The kit counts only `<body>`'s direct children: 3/4 hidden, `#root` not. Radix's hide-others leaves the Sonner live region (`aria-live="polite"`, inside `#root`) exposed and hides every other subtree inside `#root` individually (probed: header, every section, and the toast section's heading and button carry `aria-hidden`). The background is hidden; the check's heuristic misses nested hiding. |
| shadcn/ui | `select/axe` | **Library behavior (axe finding)** | While the Select is open, `#c-select` gets `aria-hidden="true"` and contains the focusable trigger: axe `aria-hidden-focus` (serious). Same Radix technique as the Radix row, but there `#root` (outside the scanned region) carried `aria-hidden`; here the live region forces hiding at section level, inside the scan. Impact on screen-reader users not tested. |
| shadcn/ui | `navigation/axe` | **Library behavior (axe finding)** | Same as Radix: NavigationMenu's focus-proxy `<span aria-hidden="true" tabindex="0">` with the submenu open. |

MUI demo-page bugs fixed before the recorded runs (first run: 71 pass, 8 fail): (1) ids passed
to `AccordionDetails` duplicated the region id MUI derives from `aria-controls` (kit errors
on four accordion checks); (2) the tooltip lacked `describeChild`, which MUI's docs require
when the child already has a label (`tooltip/described-by` failed); (3) the adapter now
names the popover (`#mui-popover .MuiPaper-root`), because MUI's `Popover` has no
`role="dialog"`, the kit's default selector.

MUI demo additions on 2026-10-19 (before the recorded runs, no failures fixed away):

1. **Navigation section.** MUI has no site-navigation component, so the demo composes
   `AppBar` + `Toolbar component="nav"` + link `Button`s (`href`, `aria-current="page"` on
   Home) + a `Menu` submenu, as in MUI's App Bar demos. The page now has two navigation
   landmarks (this one and `Pagination`'s), so the site nav carries `aria-label="Main"`;
   `navigation/landmark` passes. The submenu trigger's `aria-expanded`, `aria-haspopup` and
   `aria-controls` are set by the demo from `anchorEl` state, as for the Menu section; MUI
   does not wire them.
2. **Static alert.** MUI `Alert` (`severity="info"`) renders `role="alert"` by default;
   `alert/role` passes.

Kit leniency noted (not counted as a failure): MUI `text-field/error-described` passes
because the input is described by its helper text ("We only use this for receipts."), not
by an error message; the check accepts any `aria-describedby`. Likewise MUI
`navigation/no-menu-roles` passes because MUI portals the submenu's `role="menu"` list to
`<body>`, outside the `<nav>` the check inspects; a site-navigation submenu built on MUI
`Menu` still uses menu roles.

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
| shadcn/ui | `table/sort-*`, `table/filter-*` | shadcn `Table` is presentational; sorting and filtering are app code (its data-table recipe uses TanStack Table). |
| shadcn/ui | `alert/role` | Not declared in the demo (shadcn has an `Alert` component; not exercised). |

## Limits

- One demo page per library, one instance per component, Chromium only, no screen reader.
  A pass means the automated checks passed, not that the component is fully accessible.
- The demo pages were written for this kit; another composition of the same primitives
  can behave differently.
- Chromium only: Firefox and WebKit are not installed in this container.
- MUI's menu, popover, tab-panel, sort and navigation wiring follow MUI's documented demo
  patterns, which the app writes; the results cover those patterns, not MUI alone. MUI has
  no navigation component, so its navigation row tests an AppBar composition.
- shadcn/ui is CLI-scaffolded source, not an importable npm package, so it cannot go
  through `build.js` like the other three: it needs a scratch project generated by the
  shadcn CLI and `build.js --src` (see the targets README). Its row reflects one registry
  commit, set up from GitHub because `ui.shadcn.com` was blocked here.

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

### mui-material

- Kit: frontend-craft conformance 1.0.0
- Library: MUI (Material UI) 9.5.0 (react@19.3.0, react-dom@19.3.0, @mui/material@9.5.0, @emotion/react@11.14.0, @emotion/styled@11.14.1)
- Trust: external library under test (demo page written for this kit)
- Summary: 82 pass, 3 fail, 0 not applicable

#### button

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `button/role` | PASS | computed role: button |
| `button/name` | PASS | accessible name "Save draft" |
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
| `text-field/invalid` | FAIL | aria-invalid=false after entering "not-an-email" and submitting |
| `text-field/error-described` | PASS | aria-describedby -> mui-email-helper-text: "We only use this for receipts." |
| `text-field/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-text-field |

#### select-combobox

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `select/role` | PASS | computed role: combobox, aria-haspopup=listbox |
| `select/name` | PASS | accessible name "Fruit" |
| `select/expanded` | PASS | aria-expanded false -> true after ArrowDown; popup visible |
| `select/listbox` | PASS | listbox with 3 option(s) |
| `select/controls` | PASS | aria-controls=_r_4_ (exists) |
| `select/arrow-moves` | PASS | active option "Apple" -> "Banana" (option) |
| `select/enter-selects` | PASS | popup closed; trigger shows "Banana", expected "Banana" |
| `select/escape-closes` | PASS | popup closed; focus on div#mui-select[role=combobox] "Banana" |
| `select/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-select |

#### dialog

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `dialog/opens` | PASS | dialog visible after Enter on the trigger |
| `dialog/role` | PASS | <div> role=dialog |
| `dialog/modal` | PASS | aria-modal=true, :modal=false, background hidden: 1/1 body children aria-hidden or inert |
| `dialog/name` | PASS | accessible name "Rename project" |
| `dialog/initial-focus` | PASS | focus on input#_r_h_ |
| `dialog/focus-trap` | PASS | 5 Tab and 5 Shift+Tab presses stayed inside (3 focusable) |
| `dialog/escape` | PASS | dialog hidden after Escape |
| `dialog/return-focus` | PASS | focus on button#mui-dialog-open "Rename project" |
| `dialog/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in [role="dialog"], [role="alertdialog"], dialog[open] |

#### menu

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `menu/button` | PASS | aria-haspopup=true, aria-expanded=false |
| `menu/opens` | PASS | menu visible; aria-expanded=true |
| `menu/focus-first` | PASS | focus on li[role=menuitem] "Duplicate" |
| `menu/item-roles` | PASS | 3 menu item(s); 0 focusable element(s) without a menuitem role |
| `menu/arrows` | PASS | after ArrowDown focus on li[role=menuitem] "Archive" |
| `menu/home-end` | PASS | End -> li[role=menuitem] "Delete"; Home -> li[role=menuitem] "Duplicate" |
| `menu/escape` | PASS | menu closed; focus on button#mui-menu-btn "Actions"; aria-expanded=false |
| `menu/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-menu |

#### tabs

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `tabs/roles` | PASS | role=tablist, 3 tab(s) |
| `tabs/selected` | PASS | 1 tab(s) with aria-selected="true" |
| `tabs/controls` | PASS | aria-controls=mui-tabpanel-0 |
| `tabs/panel-name` | PASS | tabpanel name "Plan" |
| `tabs/roving-tabindex` | PASS | Tab into the tablist -> button#mui-tab-0[role=tab] "Plan"; next Tab -> button#mui-tip-btn "Copy link" |
| `tabs/arrows` | PASS | ArrowRight -> button#mui-tab-1[role=tab] "Invoices"; ArrowLeft -> button#mui-tab-0[role=tab] "Plan" |
| `tabs/wrap` | PASS | ArrowRight on the last tab -> button#mui-tab-0[role=tab] "Plan" |
| `tabs/home-end` | PASS | End -> button#mui-tab-2[role=tab] "Payment"; Home -> button#mui-tab-0[role=tab] "Plan" |
| `tabs/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-tabs |

#### tooltip-popover

7 pass, 1 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `tooltip/focus` | PASS | tooltip visible: "Copies the share link" |
| `tooltip/described-by` | PASS | aria-describedby -> "Copies the share link" |
| `tooltip/escape` | PASS | tooltip hidden; focus on button#mui-tip-btn "Copy link" |
| `tooltip/hover` | PASS | tooltip visible on hover |
| `popover/expanded` | PASS | aria-expanded false -> true; popover visible |
| `popover/controls` | PASS | aria-controls=mui-popover (exists) |
| `popover/escape` | PASS | popover closed; focus on button#mui-pop-btn "Filters" |
| `tooltip-popover/axe` | FAIL | axe-core: popover open: color-contrast |

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

6 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `toast/live-region` | PASS | message landed in role=alert; region was inserted together with the message |
| `toast/announced` | PASS | live region text: "Settings saved.×" |
| `toast/focus-kept` | PASS | focus on button#mui-toast-btn "Save settings" |
| `toast/dismiss-name` | PASS | button name(s): "Dismiss notification" |
| `alert/role` | PASS | role=alert |
| `toast-alert/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-toast, .mui-toast |

#### table

7 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `table/semantics` | PASS | role=table, 2 header cell(s), 5 row(s) |
| `table/sort-button` | PASS | role=button, name "Name", inside a column header: true |
| `table/sort-state` | PASS | aria-sort null -> ascending -> descending over two Enter presses |
| `table/sort-order` | PASS | first row: "AdaEngineer" -> "AdaEngineer" -> "MargaretDirector" |
| `table/filter-name` | PASS | accessible name "Filter by name" |
| `table/filter-works` | PASS | visible rows 5 -> 3 after typing "ar" |
| `table/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-table |

#### pagination

4 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `pagination/landmark` | PASS | role=navigation, name "pagination navigation" |
| `pagination/current` | PASS | 1 element(s) with aria-current |
| `pagination/names` | PASS | 7 control(s), all named |
| `pagination/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-pagination |

#### navigation

4 pass, 1 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `navigation/landmark` | PASS | role=navigation, name "Main", 2 navigation landmark(s) on the page |
| `navigation/current` | PASS | 1 link(s) with aria-current="page" |
| `navigation/no-menu-roles` | PASS | 0 element(s) with role menu/menubar |
| `navigation/disclosure` | PASS | aria-expanded false -> true (Enter) -> false (Escape); focus on button#mui-nav-more "More" |
| `navigation/axe` | FAIL | axe-core: color-contrast (serious) at a[href$="#home"], a[href$="#pricing"] |

### shadcn-ui

- Kit: frontend-craft conformance 1.0.0
- Library: shadcn/ui (new-york-v4 registry, generated with the shadcn CLI) shadcn-ui/ui@4233ed1caded8c38f4bc14b14afe1f93ebcaf966 (shadcn (CLI)@4.21.5, react@19.3.0, react-dom@19.3.0, radix-ui@1.8.1, sonner@2.0.8, next-themes@0.4.6, class-variance-authority@0.7.1, cn@0.4.0, lucide-react@1.57.0, tailwindcss@4.3.3, tw-animate-css@1.4.0)
- Trust: external library under test (demo page written for this kit)
- Summary: 74 pass, 5 fail, 6 not applicable

#### button

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `button/role` | PASS | computed role: button |
| `button/name` | PASS | accessible name "Save draft" |
| `button/focusable` | PASS | focus() lands on the button |
| `button/enter` | PASS | click events: "0" -> "1" after Enter |
| `button/space` | PASS | click events: "1" -> "2" after Space |
| `button/toggle-state` | PASS | aria-pressed false -> true after Space |
| `button/disabled` | PASS | disabled=true, aria-disabled=null |
| `button/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-button |

#### text-field

3 pass, 2 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `text-field/name` | PASS | accessible name "Email address" |
| `text-field/required` | PASS | required=true, aria-required=null |
| `text-field/invalid` | FAIL | aria-invalid=null after entering "not-an-email" and submitting |
| `text-field/error-described` | FAIL | no aria-describedby or aria-errormessage on the input |
| `text-field/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-text-field |

#### select-combobox

8 pass, 1 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `select/role` | PASS | computed role: combobox, aria-haspopup=null |
| `select/name` | PASS | accessible name "Fruit" |
| `select/expanded` | PASS | aria-expanded false -> true after ArrowDown; popup visible |
| `select/listbox` | PASS | listbox with 3 option(s) |
| `select/controls` | PASS | aria-controls=radix-_r_4_ (exists) |
| `select/arrow-moves` | PASS | active option "Apple" -> "Banana" (option) |
| `select/enter-selects` | PASS | popup closed; trigger shows "Banana", expected "Banana" |
| `select/escape-closes` | PASS | popup closed; focus on button#sh-select[role=combobox] "Banana" |
| `select/axe` | FAIL | axe-core (open): aria-hidden-focus (serious) at #c-select |

#### dialog

8 pass, 1 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `dialog/opens` | PASS | dialog visible after Enter on the trigger |
| `dialog/role` | PASS | <div> role=dialog |
| `dialog/modal` | FAIL | aria-modal=null, :modal=false, background hidden: 3/4 body children aria-hidden or inert |
| `dialog/name` | PASS | accessible name "Rename project" |
| `dialog/initial-focus` | PASS | focus on input#sh-name |
| `dialog/focus-trap` | PASS | 6 Tab and 6 Shift+Tab presses stayed inside (4 focusable) |
| `dialog/escape` | PASS | dialog hidden after Escape |
| `dialog/return-focus` | PASS | focus on button#sh-dialog-open "Rename project" |
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
| `menu/escape` | PASS | menu closed; focus on button#sh-menu-btn "Actions"; aria-expanded=false |
| `menu/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-menu |

#### tabs

9 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `tabs/roles` | PASS | role=tablist, 3 tab(s) |
| `tabs/selected` | PASS | 1 tab(s) with aria-selected="true" |
| `tabs/controls` | PASS | aria-controls=radix-_r_a_-content-plan |
| `tabs/panel-name` | PASS | tabpanel name "Plan" |
| `tabs/roving-tabindex` | PASS | Tab into the tablist -> button#radix-_r_a_-trigger-plan[role=tab] "Plan"; next Tab -> div#radix-_r_a_-content-plan[role=tabpanel] "You are on the monthly plan." |
| `tabs/arrows` | PASS | ArrowRight -> button#radix-_r_a_-trigger-invoices[role=tab] "Invoices"; ArrowLeft -> button#radix-_r_a_-trigger-plan[role=tab] "Plan" |
| `tabs/wrap` | PASS | ArrowRight on the last tab -> button#radix-_r_a_-trigger-plan[role=tab] "Plan" |
| `tabs/home-end` | PASS | End -> button#radix-_r_a_-trigger-payment[role=tab] "Payment"; Home -> button#radix-_r_a_-trigger-plan[role=tab] "Plan" |
| `tabs/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-tabs |

#### tooltip-popover

8 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `tooltip/focus` | PASS | tooltip visible: "Copies the share link" |
| `tooltip/described-by` | PASS | aria-describedby -> "Copies the share link" |
| `tooltip/escape` | PASS | tooltip hidden; focus on button#sh-tip-btn "Copy link" |
| `tooltip/hover` | PASS | tooltip visible on hover |
| `popover/expanded` | PASS | aria-expanded false -> true; popover visible |
| `popover/controls` | PASS | aria-controls=radix-_r_f_ (exists) |
| `popover/escape` | PASS | popover closed; focus on button#sh-pop-btn "Filters" |
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
| `toast/live-region` | PASS | message landed in role=null; region was in the DOM before the message (first seen with "") |
| `toast/announced` | PASS | live region text: "Settings saved." |
| `toast/focus-kept` | PASS | focus on button#sh-toast-btn "Save settings" |
| `toast/dismiss-name` | PASS | button name(s): "Close toast" |
| `alert/role` | N/A | adapter declares no static alert |
| `toast-alert/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-toast, [data-sonner-toast] |

#### table

2 pass, 0 fail, 5 n/a

| Check | Result | Evidence |
|---|---|---|
| `table/semantics` | PASS | role=table, 2 header cell(s), 5 row(s) |
| `table/sort-button` | N/A | adapter declares no sort control |
| `table/sort-state` | N/A | adapter declares no sort control |
| `table/sort-order` | N/A | adapter declares no sort control |
| `table/filter-name` | N/A | adapter declares no filter input |
| `table/filter-works` | N/A | adapter declares no filter input |
| `table/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-table |

#### pagination

4 pass, 0 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `pagination/landmark` | PASS | role=navigation, name "pagination" |
| `pagination/current` | PASS | 1 element(s) with aria-current |
| `pagination/names` | PASS | 5 control(s), all named |
| `pagination/axe` | PASS | axe-core WCAG 2.x A/AA: no violations in #c-pagination |

#### navigation

4 pass, 1 fail, 0 n/a

| Check | Result | Evidence |
|---|---|---|
| `navigation/landmark` | PASS | role=navigation, name "Main", 2 navigation landmark(s) on the page |
| `navigation/current` | PASS | 1 link(s) with aria-current="page" |
| `navigation/no-menu-roles` | PASS | 0 element(s) with role menu/menubar |
| `navigation/disclosure` | PASS | aria-expanded false -> true (Enter) -> false (Escape); focus on button#sh-nav-more "More" |
| `navigation/axe` | FAIL | axe-core (submenu open): aria-hidden-focus (serious) at li[data-slot="navigation-menu-item"]:nth-child(3) > span:nth-child(2) |
