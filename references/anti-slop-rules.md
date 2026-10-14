# Anti-slop rules

The Slop Lint rule set: what each rule detects, why it matters, how to fix it, and how
to write a reasoned exception. Anti-slop is not a ban list. Gradients, cards, rounded
corners, animation, and familiar layouts are fine when they serve a purpose. The rule is:
**every significant design decision has a reason.**

## Contents

1. [How to use this reference](#1-how-to-use-this-reference)
2. [Severities and confidence](#2-severities-and-confidence)
3. [Reasoned exceptions](#3-reasoned-exceptions)
4. [Token rules: tok/*](#4-token-rules)
5. [Layout rules: lay/*](#5-layout-rules)
6. [Visual rules: vis/*](#6-visual-rules)
7. [Content rules: con/*](#7-content-rules)
8. [Motion rules: mot/*](#8-motion-rules)
9. [Accessibility rules: a11y/*](#9-accessibility-rules)
10. [Responsive rules: rsp/*](#10-responsive-rules)
11. [Immersive rules: imm/*](#11-immersive-rules)
12. [Contract and exception rules](#12-contract-and-exception-rules)

## 1. How to use this reference

- Run `craft lint` when the CLI supports the rule. Rules the installed CLI does not
  implement yet are checked by reading the code; report those as "checked by inspection",
  never as tool-verified.
- In Review mode, cite rule ids in every finding (`a11y/focus at src/Button.tsx:14`).
- Fix the cause, not the symptom: a `tok/hardcoded` finding usually means a missing token.

## 2. Severities and confidence

- `block`: must be fixed or excepted with a reason before claiming done.
- `warn`: fix unless the contract says otherwise.
- `info`: worth a look; often a signal of template defaults.
- `confidence` (0–1): static heuristics never report 1. Present a 0.6 finding as
  "likely", not as fact. Rendered (Tier 2) checks can be near-certain.
- Severity can be tuned per rule in `.craft/craft.config.json` (`rules.<id>.severity`).

## 3. Reasoned exceptions

Inline, on the line before or the same line as the code:

```css
/* craft-allow vis/gradient-text: brand wordmark uses the logo gradient per brand guide */
```
```jsx
{/* craft-allow lay/clone-grid: exactly three plans; equal weight is the point */}
```
```html
<!-- craft-allow a11y/target: inline text link inside a paragraph, exempt per WCAG 2.5.8 -->
```

Per glob in config (reason required, at least 8 characters):

```json
{ "exceptions": [{ "rule": "tok/hardcoded", "glob": "src/legacy/**", "reason": "Legacy pages scheduled for removal" }] }
```

An exception without a reason is itself a finding (`exc/unreasoned`, block). Every
exception used appears in the report.

## 4. Token rules

**tok/hardcoded** (warn). Literal colors, spacing, or font sizes in CSS, inline styles, or
Tailwind arbitrary values (`bg-[#fff]`, `p-[13px]`) that are not tokens. Allowed: `0`,
`1px` hairlines, `100%`, `auto`. Why: untracked values drift and break theming. Fix: use a
token; if the value is needed, add it to `tokens.json` with a role.

**tok/unknown-var** (warn). `var(--x)` referencing a custom property defined nowhere.
Why: silently falls back to the initial value. Fix: define the token or correct the name.

## 5. Layout rules

**lay/card-depth** (warn). Card-like containers (border or shadow, plus radius, padding,
and a different background) nested more than one level, or card-like sections above the
configured share of the page (default 60 %). Why: cards inside cards flatten hierarchy and
waste space. Fix: use spacing, dividers, or headings for grouping; reserve cards for
discrete, selectable objects.

**lay/clone-grid** (warn). Three or more sibling blocks with the same structure (icon or
image, heading, at most two lines of text). Why: the default "three features" grid says
nothing specific. Fix: vary weight by importance, show the actual product, or use a list.
Exception when items really are parallel and equal (pricing tiers, steps).

## 6. Visual rules

**vis/default-stack** (info). 80 % or more of components share the same radius of 12 px or
more plus a shadow, or every button is pill-shaped, with no token role justifying it.
Why: the unexamined default look. Fix: set radius and elevation from the direction's shape
and contrast axes; differentiate controls from containers.

**vis/gradient-text** (warn). `background-clip: text` gradients, or colored glows (blur of
24 px or more) with no token role. Why: decoration standing in for hierarchy; often fails
contrast. Fix: carry emphasis with type and a solid accent; if the gradient is brand, make
it a token with a role and except it.

## 7. Content rules

**con/fabricated** (block for placeholder text, warn for claims). Lorem ipsum, "John/Jane
Doe", "Acme", invented counts ("10,000+ users"), "Trusted by" logo rows with no data source,
unattributed testimonials, star-rating filler. Skipped in fixtures and inside elements
marked `data-craft-illustrative`. Why: fake proof misleads users and ships by accident.
Fix: use real content, or mark illustrative content and list the gap as an open question.

## 8. Motion rules

**mot/no-reduced** (warn; block for autoplay or parallax). Animations, transitions, or
animation-library use without `prefers-reduced-motion` handling. Fix: wrap non-essential
motion in `@media (prefers-reduced-motion: no-preference)` or check the media query in JS;
keep essential state feedback but remove travel, parallax, and autoplay.

## 9. Accessibility rules

**a11y/focus** (block). `outline: none` or `outline: 0` without a `:focus-visible`
replacement. Fix: provide a visible focus style using the `focus` color token (3:1 against
adjacent colors).

**a11y/target** (warn; block below 24×24). Rendered interactive targets smaller than 44×44
px on touch layouts. Fix: increase padding or hit area; inline links in text are exempt.

**a11y/alt** (block). `img` without `alt`; icon-only buttons or links without an accessible
name. Fix: meaningful `alt`, or `alt=""` for decorative images; `aria-label` or visually
hidden text for icon controls.

**a11y/contrast** (block). Token foreground/background pairs below WCAG AA (4.5:1 text,
3:1 large text and UI). Checked by `craft contrast` over `pairs` in `tokens.json`.

**a11y/semantics** (warn). Clickable `div`/`span` without role and keyboard handling;
skipped heading levels; missing `lang`; missing landmarks (`main`, `nav`). Fix: use native
elements (`button`, `a`, `nav`, `main`), correct heading order, `lang` on `html`.

## 10. Responsive rules

**rsp/overflow** (block, rendered). Horizontal scroll at 320 px viewport width. Fix: find the
overflowing element (long words, fixed widths, wide tables) and wrap, shrink, or scroll it locally.

**rsp/viewport** (warn). Missing `<meta name="viewport">`, or fixed widths that force overflow.

## 11. Immersive rules

**imm/no-fallback** (block). WebGL/canvas with no no-WebGL, reduced-motion, or low-power path.
**imm/no-dom-text** (warn). Meaningful canvas content with no DOM text alternative.
**imm/unbounded-loop** (warn). Render loop with no visibility pause, no device-pixel-ratio
clamp, or no frame budget. See the `immersive-and-3d` reference for patterns.

## 12. Contract and exception rules

**ctr/contract** (block). `.craft/DESIGN.md` missing required sections, any direction axis
without a value and reason, more than 150 lines; `tokens.json` invalid or with unresolved
references. Unfilled `{{...}}` placeholders are warnings.

**exc/unreasoned** (block). A `craft-allow` exception without a reason.
