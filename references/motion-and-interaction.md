# Motion and interaction

Motion explains change, gives feedback, and, when the direction calls for it, carries
identity. It never blocks content or ignores user preferences.

## Contents

1. [Purpose first](#1-purpose-first)
2. [Motion tokens](#2-motion-tokens)
3. [Reduced motion](#3-reduced-motion)
4. [Patterns](#4-patterns)
5. [Performance](#5-performance)
6. [Micro-interactions](#6-micro-interactions)
7. [Libraries](#7-libraries)

## 1. Purpose first

Allow a motion only if it does one of these:

- **Feedback**: confirms an action (press, toggle, save).
- **Orientation**: shows where something came from or went (overlay from its trigger,
  item moving to a new list).
- **Continuity**: connects two states so the user does not lose their place.
- **Identity**: the direction's motion axis is `expressive` and this is the signature.

Everything else is decoration; remove it.

## 2. Motion tokens

Take durations and easing from the direction (`motion` axis in `recipes.json`) and store
them as tokens: `motion.fast`, `motion.base`, `motion.slow`, `motion.ease`, `motion.ease-exit`.

- Small, near elements move fast; large or far elements move slower.
- Exits are faster than entrances.
- Ease-out (decelerate) for entering, ease-in for leaving, standard for moving on screen.
- Distance stays small for UI (4–16 px); large travel is for expressive directions only.

## 3. Reduced motion

`prefers-reduced-motion: reduce` is a requirement, not an option (`mot/no-reduced`).

```css
.panel { opacity: 0; }
.panel[data-open] { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
  .panel { transform: translateY(8px); transition: opacity var(--motion-base) var(--motion-ease), transform var(--motion-base) var(--motion-ease); }
  .panel[data-open] { transform: none; }
}
```

- Reduce means remove travel, parallax, zoom, and autoplay; keep instant state changes and
  gentle opacity fades.
- In JavaScript: `matchMedia('(prefers-reduced-motion: reduce)')`, and listen for changes.
- Autoplaying motion longer than five seconds needs a pause control (WCAG 2.2.2).
- Never flash more than three times per second.

## 4. Patterns

- **Overlay enter and exit**: fade plus a short translate or scale from the trigger.
- **Disclosure**: animate height with `grid-template-rows: 0fr` to `1fr`, or
  `interpolate-size` where supported; otherwise no height animation.
- **List changes**: animate inserted and removed items; FLIP technique or the View
  Transitions API for reorders.
- **Page transitions**: View Transitions API (same-document or cross-document) with a
  reduced-motion fallback that does no transition.
- **Scroll-linked**: CSS scroll-driven animations (`animation-timeline: view()`) for
  progress and reveal effects; content must be readable without them.
- **Loading**: skeleton shimmer stops under reduced motion.

## 5. Performance

- Animate `transform` and `opacity`; avoid animating layout properties (`width`, `top`, `height`)
  on large elements.
- Use `will-change` sparingly and remove it after the animation.
- Pause offscreen and background-tab animation (IntersectionObserver, `visibilitychange`).
- Keep interactions responsive: no long tasks during input; INP is affected by heavy handlers.

## 6. Micro-interactions

- Press feedback within 100 ms; hover only as an enhancement.
- Toggles show the new state immediately (optimistic) and roll back visibly on failure.
- Drag and drop has a keyboard alternative and announces moves.
- Do not hijack scroll. Smooth scrolling for in-page anchors only, and not under reduced motion.

## 7. Libraries

Use what the project already has. CSS transitions, the Web Animations API, and View
Transitions cover most UI needs without a dependency. Add an animation library only for
needs CSS cannot meet (physics, complex timelines, shared-layout animation) and only with
the user's agreement. Whatever the library, route reduced motion through it (most expose a
reduced-motion setting or hook).
