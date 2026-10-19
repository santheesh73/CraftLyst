# Framework adapters

Where tokens, contracts, and checks plug into each supported stack. Follow the project's
existing patterns first; these are defaults for when no pattern exists.

## Contents

1. [Support levels](#1-support-levels)
2. [React and Next.js](#2-react-and-nextjs)
3. [Tailwind CSS](#3-tailwind-css)
4. [Plain HTML and CSS](#4-plain-html-and-css)
5. [Vue](#5-vue)
6. [Svelte](#6-svelte)
7. [Astro](#7-astro)
8. [Component libraries](#8-component-libraries)

## 1. Support levels

| Stack | Static checks (T0) | Rendered checks (T2) |
|---|---|---|
| React, Next.js, Tailwind | CSS, JSX/TSX, Tailwind classes | yes |
| Plain HTML and CSS | full | yes |
| Vue, Svelte, Astro | CSS level (style blocks and CSS files) | yes |

Every static rule runs in every stack listed above; `craft lint --json` reports which files it read.

## 2. React and Next.js

- Tokens: emit CSS variables in a global stylesheet imported once (`app/globals.css` in the
  App Router, `pages/_app` import in the Pages Router), or map them into the Tailwind theme.
- Theme switching: set `data-theme` on `html`; avoid a flash by setting it before hydration
  (an inline script in the root layout, or the framework's theme package if already used).
- Use `next/image` with explicit sizes and `next/font` for self-hosted fonts if the project
  uses Next.js; do not add them to non-Next projects.
- Server components for static content; client components only for interactivity.
- Exceptions in JSX: `{/* craft-allow rule/id: reason */}`.

## 3. Tailwind CSS

- Map semantic tokens to theme keys so utilities express roles: `bg-surface`, `text-muted`,
  `rounded-control`. Do not encode primitives (`bg-blue-600`) in components.
- Tailwind v4 (CSS-first config):

```css
@import "tailwindcss";
@theme {
  --color-surface: var(--color-surface);
  --color-text: var(--color-text);
  --radius-control: var(--radius-control);
}
```

  Define the underlying variables per theme in `:root` and `[data-theme="dark"]` (or in the
  `@media (prefers-color-scheme: dark)` block).
- Tailwind v3 (`tailwind.config.js`): `theme.extend.colors.surface = 'var(--color-surface)'`
  and similar for spacing, radius, and shadows.
- Arbitrary values (`p-[13px]`, `bg-[#0b0b0f]`) are flagged by `tok/hardcoded`.
- Prefer component extraction over long repeated class strings; use the project's existing
  helper (`clsx`, `cn`, `cva`) if present.

## 4. Plain HTML and CSS

- One `tokens.css` with custom properties, linked before other styles.
- Layer styles with `@layer reset, tokens, base, components, utilities;` to control cascade.
- Native elements cover most components (`dialog`, `details`, `popover` attribute, form controls).
- Exceptions: `<!-- craft-allow rule/id: reason -->` in HTML, `/* craft-allow ... */` in CSS.

## 5. Vue

- Tokens as CSS variables in a global stylesheet; component styles in `<style scoped>` use
  `var(--token)`.
- Use the project's component library if present; follow its theming API for token mapping.
- Exceptions in templates: `<!-- craft-allow ... -->`; in style blocks: `/* craft-allow ... */`.

## 6. Svelte

- Global tokens in `app.css` (SvelteKit) or the root layout; component `<style>` blocks use
  variables.
- Use `prefers-reduced-motion` with Svelte transitions: pass `duration: 0` when reduced.
- Exceptions as in Vue.

## 7. Astro

- Global tokens in a layout-level stylesheet; component styles in `<style>` (scoped by default).
- Keep islands minimal (`client:visible` or `client:idle` before `client:load`).
- Framework components inside Astro follow their own framework section above.

## 8. Component libraries

| Library type | How tokens apply |
|---|---|
| shadcn/ui-style (copied source + Tailwind + CSS variables) | map semantic tokens to its CSS variables; edit components in place |
| Headless (Radix Primitives, React Aria, Headless UI, Bits UI) | style with your tokens; behavior and ARIA come from the library |
| Styled (MUI, Chakra, Mantine, Bootstrap) | map tokens into the library's theme object or variables; do not fight its styling with overrides |

Check behavior against the contracts in the `component-guidelines` reference regardless of
library. Libraries reduce work; they do not guarantee correct labels, states, or content.
