# Component contracts

Frontend Craft does not ship a UI kit. It ships **contracts**: what a component must do
(purpose, states, keyboard map, ARIA pattern, responsive rules, failure cases), and a
**conformance kit** that checks any implementation against them: shadcn/ui, Radix, MUI,
React Aria, or hand-rolled. Use your design system; prove it behaves.

## Contracts

| Component | Contract | Suite |
|---|---|---|
| Button | [components/button.md](components/button.md) | `button` |
| Text field and validation | [components/text-field.md](components/text-field.md) | `text-field` |
| Select and combobox | [components/select-combobox.md](components/select-combobox.md) | `select-combobox` |
| Dialog | [components/dialog.md](components/dialog.md) | `dialog` |
| Menu | [components/menu.md](components/menu.md) | `menu` |
| Tabs | [components/tabs.md](components/tabs.md) | `tabs` |
| Tooltip and popover | [components/tooltip-popover.md](components/tooltip-popover.md) | `tooltip-popover` |
| Accordion and disclosure | [components/accordion-disclosure.md](components/accordion-disclosure.md) | `accordion-disclosure` |
| Toast and alert | [components/toast-alert.md](components/toast-alert.md) | `toast-alert` |
| Table (sort, filter) | [components/table.md](components/table.md) | `table` |
| Pagination | [components/pagination.md](components/pagination.md) | `pagination` |
| Navigation | [components/navigation.md](components/navigation.md) | `navigation` |

Each contract ends with a table mapping requirements to check ids (`dialog/focus-trap`).
Contracts were written for this project from the WAI-ARIA Authoring Practices principles
and WCAG 2.2; they do not copy APG text or any library's code.

## Run the kit

Needs Playwright and axe-core in the project (or next to the CLI) and Chromium. The kit
never installs them; with the user's approval:

    npm install --save-dev --save-exact playwright@1.56.1 axe-core@4.13.0 && npx playwright install chromium

Then:

    node contracts/conformance/run.js --adapter path/to/adapter.json [--components dialog,menu] [--json] [--allow-network]

(In the installed skill the kit is at `<skill dir>/contracts/conformance/run.js`.)

| Exit | Meaning |
|---|---|
| 0 | every check passed or was not applicable |
| 1 | at least one check failed |
| 2 | usage error: bad flags, adapter, or page |
| 3 | Playwright, axe-core, or Chromium unavailable (report as not verified) |

The runner prints Markdown (or JSON with `--json`) to stdout and writes no files. Only
`file://` and loopback pages and requests are allowed; anything else is blocked unless
`--allow-network` is passed.

## Write an adapter

An adapter is a small JSON file next to (or pointing at) the page under test:

```json
{
  "name": "my-app-components",
  "library": { "name": "shadcn/ui", "version": "as installed" },
  "trust": "project components",
  "page": { "url": "http://localhost:6006/iframe.html?id=kitchen-sink", "ready": "#root main" },
  "components": {
    "dialog": { "trigger": "[data-test=rename-open]" },
    "tabs": { "tablist": "[data-test=billing-tabs]", "region": "[data-test=billing]" },
    "table": { "notApplicable": "No data tables in this product." }
  }
}
```

- `page.file` (relative to the adapter) or `page.url` (loopback); `page.ready` is a
  selector to wait for. A component may override `page`.
- Each component lists selectors; the keys are documented at the end of each contract
  (`trigger`, `tablist`, `triggers`, `input`, `region` for the axe scan, and so on).
- Missing components, or `"notApplicable": "<reason>"`, are reported as not applicable.
- A kitchen-sink page or a Storybook iframe works well; one instance per component.

## Read the results

Every check reports `pass`, `fail`, or `not_applicable` with evidence (what the kit saw:
roles, attribute values, where focus went, axe rule ids). A check the kit could not reach
because an earlier step failed is reported as `fail` with "not evaluated" evidence. A pass
means the automated checks passed in Chromium; it does not replace a screen-reader test.
Investigate failures before blaming the library: see
[docs/evals/conformance-results.md](../docs/evals/conformance-results.md) for kit bugs
found that way.

## Fixtures and targets

| Path | What | Trust |
|---|---|---|
| [conformance/fixtures/reference/](conformance/fixtures/reference/) | Hand-rolled HTML and JS implementing all 12 contracts; the passing baseline. | L1: test fixture, not a component library |
| [conformance/fixtures/broken/](conformance/fixtures/broken/) | Every component wrong on purpose; proves the checks fail. | negative fixture |
| [conformance/targets/](conformance/targets/) | Demo pages and adapters for Radix Primitives and React Aria Components. | external libraries under test |

There are no reference implementations to copy: maintained libraries exist for every
contract here, so use one (or your own) and run the kit against it.

Design notes: [ADR-0015](../docs/decisions/0015-conformance-harness.md).
