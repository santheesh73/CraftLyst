# Templates

Files that `craft init` copies into a project's `.craft/` directory. They pass our own
checks: `tokens.json` validates against the schema and every declared pair meets WCAG AA
in both themes; `DESIGN.md` has every required section (placeholders are reported as
warnings until filled).

| File | Purpose |
|---|---|
| `DESIGN.md` | The design contract summary, 150 lines or fewer |
| `tokens.json` | Primitive, semantic, and component tokens with light and dark mappings |
| `decisions.md` | Dated log of decisions and rejected alternatives |
| `craft.config.json` | Stack, thresholds, severity overrides, ignore globs, exceptions |
