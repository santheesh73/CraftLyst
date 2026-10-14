# Customization

All project settings live in `.craft/craft.config.json` (schema:
`cli/schemas/config.schema.json`).

| Key | Purpose | Default |
|---|---|---|
| `stack.framework`, `stack.styling` | override detection | `auto` |
| `stack.touch` | touch layouts (affects `a11y/target`) | `true` |
| `failOn` | lowest severity that makes `craft lint` exit 1 | `block` |
| `rules.<id>.severity` | `block`, `warn`, `info`, or `off` | rule default |
| `thresholds.*` | card share, card depth, clone-grid size, default-stack share, target sizes, glow blur | see template |
| `ignore` | globs to skip | build output and dependencies |
| `exceptions` | per-glob exceptions; each needs `rule`, `glob`, and a `reason` of 8+ characters | none |
| `tier1.commands` | override detected lint, typecheck, test, build commands | detected |
| `tier2` | `url` or `startCommand`, `routes`, `viewports` | 320/375/768/1280/1920 |
| `contract.maxDesignLines` | lower the `DESIGN.md` limit (max 150) | 150 |

v0.1 reads `failOn` and `contract.maxDesignLines`; the other keys are validated now and used
by the rules and tiers added in v0.2.

## Inline exceptions

```css
/* craft-allow vis/gradient-text: brand wordmark uses the logo gradient */
```

See the `anti-slop-rules` reference for JSX and HTML forms.
