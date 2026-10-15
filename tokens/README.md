# Tokens

- `recipes.json` maps Direction Engine axis positions to token ranges (P1).
- The token model is primitive -> semantic -> component, with per-theme values on semantic
  and component tokens (schema: `cli/schemas/tokens.schema.json`). The neutral starter is
  [templates/tokens.json](../templates/tokens.json); its gray scale and single accent are
  placeholders, not a brand palette. No universal brand palette is imposed.
- `craft tokens build` emits the adapters from `.craft/tokens.json` into `.craft/build/`:
  `tokens.css` (CSS custom properties, the portable baseline, with light/dark mappings),
  `tailwind.v3.cjs`/`tailwind.v3.mjs` (Tailwind v3 preset), and `tailwind.v4.css`
  (Tailwind v4 `@theme`). Code: `cli/src/tokens-build.js`; design: ADR-0016.
