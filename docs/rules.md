# Slop Lint rules

`craft lint` runs the T0 rules below on CSS, HTML, JSX/TSX, Vue, Svelte, and Astro files. T2 rules need
a rendered page and run only in `craft shoot`; lint lists them as not run. Each
finding has a severity (`block`, `warn`, `info`) and a confidence between 0 and 1.
Severities and confidences listed here are the defaults; a rule may lower them for a
specific finding when the evidence is weaker.

The positive and negative fixture for each rule are in `cli/fixtures/rules/<id>/`. The
measured false-positive rate is in [evals/false-positives.md](evals/false-positives.md).

## Tokens

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `tok/hardcoded` | warn | 0.85 | T0 | Literal colors, spacing, or font sizes that are not design tokens. |
| `tok/unknown-var` | warn | 0.7 | T0 | var(--x) references a custom property that is defined nowhere in the project or tokens. |

## Layout

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `lay/card-depth` | warn | 0.65 | T0 | Card-like containers nested more than one level, or cards making up most page sections. |
| `lay/clone-grid` | warn | 0.6 | T0 | Three or more sibling blocks with the same icon + heading + short text structure. |

## Visual

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `vis/default-stack` | info | 0.5 | T0 | Most components share one large radius plus shadow, or every button is a pill, with no contract reason. |
| `vis/gradient-text` | warn | 0.85 | T0 | Gradient text (background-clip: text) or large colored glows without a token role. |

## Content

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `con/fabricated` | block | 0.8 | T0 | Placeholder text, invented names and counts, unsourced proof, and unattributed testimonials. |

## Motion

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `mot/no-reduced` | warn | 0.75 | T0 | Animations, transitions, or animation libraries with no prefers-reduced-motion handling; autoplay and parallax are blocking. |

## Accessibility

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `a11y/focus` | block | 0.8 | T0 | outline: none/0 (or outline-none) without a :focus-visible replacement. |
| `a11y/target` | warn | 0.9 | T2 | Rendered interactive targets smaller than 44x44px on touch layouts (below 24x24px is blocking). |
| `a11y/alt` | block | 0.85 | T0 | Images without alt; icon-only buttons and links without an accessible name. |
| `a11y/contrast` | block | 0.95 | T0 | Token foreground/background pairs (and literal same-rule color pairs) below WCAG AA. |
| `a11y/semantics` | warn | 0.7 | T0 | Clickable div/span without role and keyboard support, heading-level skips, missing lang, missing main landmark. |

## Responsive

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `rsp/overflow` | block | 0.95 | T2 | Horizontal page scroll at 320px viewport width. |
| `rsp/viewport` | warn | 0.7 | T0 | Missing or zoom-blocking meta viewport; fixed widths that force horizontal overflow. |

## Immersive and 3D

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `imm/no-fallback` | block | 0.6 | T0 | WebGL/canvas scenes without no-WebGL, reduced-motion, and low-power paths. |
| `imm/no-dom-text` | warn | 0.5 | T0 | Meaningful text rendered inside canvas/WebGL without a DOM text alternative. |
| `imm/unbounded-loop` | warn | 0.55 | T0 | Render loops with no visibility pause, no device-pixel-ratio clamp, or no frame budget. |

## Contract

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `ctr/contract` | block | 1 | T0 | DESIGN.md missing sections, axes, or reasons, or over 150 lines; tokens.json invalid or with unresolved references. |

## Exceptions

| Rule | Severity | Confidence | Tier | What it flags |
|---|---|---|---|---|
| `exc/unreasoned` | block | 1 | T0 | A craft-allow exception without a rule id or a reason, or naming an unknown rule. |

## Suppressing a finding

Put a `craft-allow` comment with a reason just before the rule or element it covers:

```css
/* craft-allow tok/hardcoded: brand logo color from the logo guidelines */
.logo { fill: #ff3e00; }
```

An allow without a reason is itself a finding (`exc/unreasoned`). Reasoned exceptions are
listed in the report so a reviewer can see them. Mark mock or demo content with the
`data-craft-illustrative` attribute instead of allowing each placeholder.
