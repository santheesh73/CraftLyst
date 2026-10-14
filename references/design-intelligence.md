# Design intelligence

How to think about a frontend before touching pixels: product, audience, hierarchy,
composition, and the judgment calls that separate a specific interface from a template.

## Contents

1. [Understand the product](#1-understand-the-product)
2. [Hierarchy before style](#2-hierarchy-before-style)
3. [Information architecture](#3-information-architecture)
4. [Art direction](#4-art-direction)
5. [Composition and layout](#5-composition-and-layout)
6. [Type, color, space as one system](#6-type-color-space-as-one-system)
7. [Density](#7-density)
8. [Interaction design](#8-interaction-design)
9. [Content first](#9-content-first)
10. [Judgment checklist](#10-judgment-checklist)

## 1. Understand the product

Answer these before choosing any visual treatment. Read the repo, README, existing
pages, and copy first; ask only what they do not answer.

- **Job**: what does a user hire this screen to do? Name one primary task per screen.
- **Audience**: who, how often, on what device, with what expertise and under what pressure.
  A nurse on a night shift and a collector browsing on a Sunday need different interfaces.
- **Success**: what does the user leave with (a decision, a purchase, an answer, a saved record)?
- **Content reality**: what fills the screen in production: 3 items or 3,000? 12-character
  names or 80? Real photos or none? Design for the real distribution, not the happy path.
- **Constraints**: existing design system, brand rules, stack, accessibility target, locales, budget.

Write the answers into section 1 of `.craft/DESIGN.md`. If an answer is a guess, list it
under "Open questions and assumptions".

## 2. Hierarchy before style

Every screen has one most-important thing. Make it win on at least two of: position
(top, left in LTR), size, weight, contrast, isolation (space around it).

- Rank the elements: primary (1), secondary (2–3), tertiary (everything else).
- Give tertiary content less contrast, smaller size, or progressive disclosure, never
  equal emphasis. When everything is bold, nothing is.
- One primary action per view. Secondary actions are visually quieter (outline, text style).
- Test: blur the screenshot (or squint). The primary element and the reading order must
  still be obvious.

## 3. Information architecture

- Group by the user's mental model, not by the database schema.
- Navigation depth: prefer broad and shallow for browsing, narrow and deep for guided flows.
- Labels use the user's words. "Billing" beats "Monetization settings".
- Put frequently used controls where the eye already is; put destructive ones out of the
  primary path and confirm them.
- Every list needs empty, loading, error, one-item, and many-item designs.

## 4. Art direction

Art direction is the deliberate choice of a point of view: what the interface should feel
like and why. Use the Direction Engine (the `direction-engine` reference) to set axis
values, then choose a **signature move**: one memorable, product-specific idea.

Good signature moves come from the product's own world:
- a logistics tool that uses route-line geometry as its divider language;
- a type foundry site whose layout grid is the specimen's baseline grid;
- a budgeting app where the accent color is reserved exclusively for money left to spend.

Weak signature moves are interchangeable: "a gradient hero", "glassmorphism cards",
"a bold font". If it would fit an unrelated product unchanged, it is not a signature.

## 5. Composition and layout

- Start from content structure, then choose a grid. A 12-column grid is a tool, not a goal.
- Vary rhythm: alternate dense and open sections; not every section is a centered stack.
- Asymmetry signals intent; perfect symmetry everywhere reads as a template.
- Align to a small number of edges. Every new alignment line costs attention.
- Use proximity for grouping before borders; use borders before cards; use cards only when
  the item is a discrete, movable, or selectable object.
- Repetition is for genuinely parallel items. Three identical feature boxes are only right
  when there are exactly three parallel things worth equal weight.

## 6. Type, color, space as one system

- Type carries hierarchy first. A clear scale (one ratio) with two or three weights solves
  most hierarchy problems before color is needed.
- Color communicates roles (surface, text, accent, status), not decoration. One accent used
  sparingly is louder than five.
- Space is a hierarchy tool: related items close, unrelated far. Use the token scale only.
- All three come from `.craft/tokens.json`. A value that is not a token is a decision
  nobody recorded.

## 7. Density

Density follows frequency and expertise. Daily expert tools need compact density; occasional
consumer flows need balanced; reading and showcase need airy. Mixed products can vary
density per surface (compact table inside a balanced page), but each surface is consistent.

## 8. Interaction design

- Every control shows its states: default, hover, focus-visible, active, disabled, loading.
- Feedback within 100 ms for direct manipulation; show progress for anything longer than ~1 s.
- Prefer undo over confirmation dialogs for reversible actions.
- Forms: label every field, validate on blur or submit (not on every keystroke), say how to fix.
- Keyboard: everything reachable and operable; visible focus; logical order.

## 9. Content first

Design with real or realistic content. Never fill a layout with invented testimonials,
fake user counts, placeholder logos, or lorem ipsum (`con/fabricated`). When content is
unknown, use clearly marked illustrative content (`data-craft-illustrative`) and list the
gap under open questions.

## 10. Judgment checklist

Before implementing, confirm:

- [ ] Primary task and primary element named for each screen
- [ ] Axis values and a signature move recorded in `.craft/DESIGN.md`
- [ ] Two directions considered; the rejected one logged in `decisions.md`
- [ ] Swap test passed: the design would look wrong on an unrelated product
- [ ] Real content distribution known (lengths, counts, empty cases)
- [ ] Every repeated or carded element has a reason to be repeated or carded
