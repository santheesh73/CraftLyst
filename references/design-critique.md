# Design critique (Review mode)

Review mode is read-only: critique an existing interface using the same rule ids and
the same honesty rules as building. Do not edit files unless the user asks for fixes.

## Contents

1. [Procedure](#1-procedure)
2. [What to look at](#2-what-to-look-at)
3. [Writing findings](#3-writing-findings)
4. [Output format](#4-output-format)
5. [Calibration](#5-calibration)

## 1. Procedure

1. Read `.craft/DESIGN.md` if present; critique against the contract first, generic
   rules second. Without a contract, infer the product and audience and state the inference.
2. Run what the installed CLI supports (`craft lint --json`, `craft contrast --json`) and
   any project lint or type-check. Record what ran.
3. Inspect the code for rules the CLI does not cover; mark those findings "by inspection".
4. If the app can be rendered (Tier 2), look at 320 px and 1280 px widths, keyboard
   navigation, and reduced motion. If it cannot, say so.
5. Rank findings by user impact, then write the report.

## 2. What to look at

Order matters: hierarchy and function before decoration.

1. **Task fit**: can the primary task be done quickly? Is the primary element obvious?
2. **Hierarchy**: one clear focal point per view; reading order; competing emphasis.
3. **Function**: states (loading, empty, error, disabled, success); forms; navigation.
4. **Accessibility**: focus, names, contrast, semantics, targets, motion.
5. **Responsiveness**: 320 px overflow, touch targets, content reflow, long strings.
6. **Consistency**: token use, spacing rhythm, type scale adherence.
7. **Specificity**: swap test; template defaults (clone grids, card-everything, glow).
8. **Content honesty**: fabricated proof, placeholder text.

## 3. Writing findings

Each finding has: rule id (or `design/<topic>` for judgment calls without a rule), location,
what is wrong, why it matters to this product's users, a concrete fix, and confidence.

- Good: "`lay/clone-grid` at `app/page.tsx:40-88` (likely, 0.7): three identical feature
  tiles give equal weight to 'SSO' and 'Dark mode'. Admins buy on SSO; lead with it as a
  wide row with a screenshot, demote the rest to a list."
- Weak: "The features section looks generic."

Praise what works, briefly. It tells the user what to keep.

## 4. Output format

```markdown
## Review: <scope>
Highest tier reached: T0 (lint, contrast) | T1 | T2 | none
Checked: <commands that ran>    Not checked: <what and why>

### Must fix (block)
1. <rule-id> <file:line> (confidence) - problem. Why. Fix.

### Should fix (warn)
...

### Consider (info / judgment)
...

### Keep
- <what works and why>
```

## 5. Calibration

- Do not inflate: a heuristic match is "likely" until confirmed by reading the code.
- Do not pile on: group repeated instances of one rule into one finding with a count and
  a few locations.
- Respect the contract: if `DESIGN.md` deliberately chooses something a generic rule
  flags (for example soft shapes with pills), it is not a finding unless it harms users.
