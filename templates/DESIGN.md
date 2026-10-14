# Design contract: {{product name}}

<!-- Frontend Craft design contract. Read it before every frontend change; update it when a decision changes.
     Keep it under 150 lines: rationale goes in decisions.md, values go in tokens.json.
     Replace every {{...}}. Anything you cannot decide yet goes under section 6. -->

## 1. Product, audience, primary tasks

- Product: {{one sentence: what it is and the job it does}}
- Audience: {{who uses it, where, how often, with what expertise}}
- Primary tasks, most important first:
  1. {{task}}
  2. {{task}}
  3. {{task}}
- Content: {{what fills the screens: tables, long-form text, media, forms, code}}
- Constraints: {{brand rules, existing design system, stack, accessibility target (WCAG 2.2 AA by default), locales and RTL, performance budget}}

## 2. Direction

| Axis | Value | Reason |
|---|---|---|
| Density | {{compact / balanced / airy}} | {{why, tied to tasks or audience}} |
| Temperature | {{warm / neutral / cool}} | {{why}} |
| Formality | {{playful / approachable / formal}} | {{why}} |
| Motion energy | {{still / subtle / expressive}} | {{why}} |
| Shape language | {{sharp / mixed / soft}} | {{why}} |
| Contrast | {{low / medium / high}} | {{why}} |
| Typographic voice | {{neutral-sans / humanist / geometric / editorial-serif / technical-mono / display}} | {{why}} |
| Imagery | {{type-led / balanced / imagery-led}} | {{why}} |

Rejected direction: {{one line naming the alternative and why it lost; full entry in decisions.md}}

## 3. Signature move

{{The one memorable idea that belongs to this product and no other. It must fail the swap test:
on an unrelated product it would look wrong. Describe where it appears and where it must not.}}

## 4. Token summary

Source of truth: `.craft/tokens.json`. This section summarizes; it never overrides.

- Type scale: {{ratio, base size, families by role}}
- Spacing: {{base unit and steps; section rhythm}}
- Color roles: {{surface, text, accent, status roles and what each is for}}
- Radii: {{control, container; when each applies}}
- Elevation: {{shadow or border policy; which layers get depth}}
- Motion: {{durations, easing, what animates and what never does; reduced-motion behavior}}

## 5. Never do

Product-specific prohibitions (generic rules live in the skill's anti-slop reference):

- {{e.g. "Never put account balances inside decorative cards; they live in the ledger table."}}
- {{...}}
- {{...}}

## 6. Open questions and assumptions

- Assumption: {{what was assumed and why}}
- Question: {{what needs a human answer, and who can answer it}}
