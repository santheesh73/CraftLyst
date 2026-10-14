# Color and tokens

The token model, color roles, contrast, theming, and how tokens reach code. Tokens are the
contract's machine-readable half: `.craft/tokens.json`.

## Contents

1. [Token model](#1-token-model)
2. [tokens.json format](#2-tokensjson-format)
3. [Color roles](#3-color-roles)
4. [Building a palette](#4-building-a-palette)
5. [Contrast](#5-contrast)
6. [Dark mode and themes](#6-dark-mode-and-themes)
7. [Emitting tokens to code](#7-emitting-tokens-to-code)
8. [Working with an existing system](#8-working-with-an-existing-system)

## 1. Token model

Four layers; each references only the layer above it.

| Layer | Example | Rule |
|---|---|---|
| primitive | `color.blue-600 = #2f5fc4`, `space.4 = 16px` | raw values; never used directly in components |
| semantic | `color.accent -> {primitive.color.blue-600}` | named by role, not appearance |
| component | `button.radius -> {semantic.radius.control}` | only where a component needs its own knob |
| theme | `color.text: { light: ..., dark: ... }` | per-theme values on semantic or component tokens |

Name semantic tokens by job (`text-muted`, `surface-raised`, `danger`), never by look
(`gray-text`, `light-box`). A rebrand should change primitives only.

## 2. tokens.json format

```json
{
  "schemaVersion": "1.0",
  "name": "acme-tokens",
  "themes": ["light", "dark"],
  "primitive": { "color": { "ink-900": "#1b1e22" }, "space": { "4": "16px" } },
  "semantic": { "color": { "text": { "light": "{primitive.color.ink-900}", "dark": "..." } } },
  "component": { "button": { "radius": "{semantic.radius.control}" } },
  "pairs": [{ "fg": "color.text", "bg": "color.surface", "use": "text" }]
}
```

- References use `{layer.group.name}`. Every reference must resolve in every theme.
- `pairs` lists every foreground/background combination the UI relies on; `use` is `text`
  (4.5:1), `large-text` (3:1, 24 px+ or 18.66 px+ bold), or `ui` (3:1 for borders, icons,
  focus rings). `craft contrast` checks them in every theme.
- Schema: `cli/schemas/tokens.schema.json` in the skill package.

## 3. Color roles

Minimum semantic set for most products:

- Surfaces: `surface`, `surface-raised`, `surface-sunken` (and `overlay` if needed).
- Text: `text`, `text-muted` (still AA on every surface it sits on).
- Lines: `border` (decorative), `border-strong` (3:1, for inputs and essential boundaries).
- Accent: `accent`, `accent-strong`, `on-accent` (text on accent backgrounds).
- Feedback: `danger`, `success`, `warning`, each AA as text on `surface`; add `*-surface`
  variants for banners if used.
- `focus`: the focus ring color, 3:1 against adjacent colors.

Status is never communicated by color alone: pair it with an icon, text, or shape.

## 4. Building a palette

1. Derive temperature from the direction: neutral tint and chroma come from `recipes.json`.
2. Choose the accent hue from the brand or the product's world, not from habit.
3. Build each hue as a lightness ramp (OKLCH makes steps perceptually even), then pick
   semantic mappings by contrast, not by step number.
4. Keep the accent rare. If more than roughly a tenth of a screen is accent-colored, it stops
   signaling anything.
5. Test every pair with `craft contrast` before writing components.

## 5. Contrast

- WCAG 2.x AA: 4.5:1 for normal text, 3:1 for large text and essential UI (borders that
  identify a control, focus indicators, icons that carry meaning).
- Ratios are computed on composited colors. A translucent background cannot be verified
  statically; `craft contrast` reports it as unresolved rather than passing it.
- Placeholder text, disabled-looking-but-enabled controls, and text over images are the
  usual failures. For text over images use a scrim token, and verify rendered.
- Do not claim APCA or WCAG 3 compliance; the tooling checks WCAG 2.x ratios.

## 6. Dark mode and themes

- Dark mode is a separate mapping, not an inversion. Reduce surface contrast steps, lower
  accent saturation slightly, and re-check every pair.
- Use `prefers-color-scheme` for the default and allow a user override when the product
  has a theme switch. Emit `color-scheme: light dark` so form controls match.
- Elevation in dark themes reads from lighter surfaces more than from shadows.
- Forced colors (Windows High Contrast): do not rely on background colors for meaning;
  keep borders on controls so they survive `forced-colors: active`.

## 7. Emitting tokens to code

CSS custom properties are the portable baseline (works in every stack):

```css
:root { --color-text: #1b1e22; --color-surface: #ffffff; --space-4: 16px; }
@media (prefers-color-scheme: dark) { :root { --color-text: #f6f7f8; --color-surface: #111316; } }
[data-theme="dark"] { --color-text: #f6f7f8; --color-surface: #111316; }
```

- Name variables `--<group>-<name>` from semantic and component tokens; primitives may be
  emitted for reference but components use semantic variables.
- Tailwind v4: map variables in `@theme` (`--color-surface: var(--color-surface)` style) so
  utilities like `bg-surface` exist. Tailwind v3: extend `theme.colors` with
  `'surface': 'var(--color-surface)'`. Adapters in `craft tokens build` arrive in v0.5;
  until then write the mapping by hand, following this pattern.
- Never hardcode a value that has a token (`tok/hardcoded`).

## 8. Working with an existing system

If the project already defines tokens (Tailwind theme, CSS variables, a design-system
package), describe them in `tokens.json` instead of replacing them: semantic names map to
the existing variables or classes. Add tokens only for real gaps, and log additions in
`decisions.md`.
