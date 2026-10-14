# ADR-0015: Conformance harness for component contracts

- Status: accepted
- Date: 2026-10-14

## Context

P5 ships component contracts instead of a UI kit. Contracts are only useful if they can be
checked against whatever the project already uses (shadcn/ui, Radix, MUI, React Aria,
hand-rolled), without adapting the library to our tests.

## Decision

- Checks are plain functions per component that drive a real page through Playwright's
  public API: keyboard presses, focus, ARIA attributes, Playwright's computed role and
  accessible name (ARIA snapshot), and an axe-core scan (WCAG 2.x A/AA tags) of the region.
- An **adapter** is a JSON file: how to open the page (`file` or loopback `url`) and
  selectors per component. No adapter code runs in the harness.
- Results are `pass`, `fail`, or `not_applicable` with evidence; unreached checks are
  failures with "not evaluated" evidence. A later failure for the same check is never
  overwritten by a pass.
- Each component runs in a fresh browser context with reduced motion, so components do
  not leak state into each other.
- Playwright and axe-core are resolved like `craft shoot` does (ADR-0013) and never
  installed; missing tools exit 3. Only `file://` and loopback are reachable unless
  `--allow-network` (ADR-0012).
- The runner is a separate script (`contracts/conformance/run.js`), not a `craft`
  subcommand, because it prints results only and writes nothing; it can be promoted later.
- Libraries do things differently: the kit accepts equivalent techniques where the
  contract allows them (focus or `aria-activedescendant`; `aria-modal` or a hidden
  background) and reports which one it saw.

## Consequences

Adapters stay tiny and library-agnostic. The kit only sees DOM behavior in Chromium, so a
pass is evidence, not a screen-reader verdict. Running it against Radix and React Aria
found six kit bugs, fixed and recorded in `docs/evals/conformance-results.md`; more will
surface with more libraries.
