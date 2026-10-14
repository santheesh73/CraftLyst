# Frontend engineering

Engineering standards that make the design real: inspect before editing, reuse, respect
the stack, cover states, and keep it fast.

## Contents

1. [Inspect before editing](#1-inspect-before-editing)
2. [Respect the framework](#2-respect-the-framework)
3. [Semantic, typed, composable](#3-semantic-typed-composable)
4. [States and data](#4-states-and-data)
5. [Performance](#5-performance)
6. [Project checks (Tier 1)](#6-project-checks-tier-1)
7. [Change hygiene](#7-change-hygiene)

## 1. Inspect before editing

Before writing code, find out:

- Framework, router, and rendering mode (static, server, client) from `package.json`,
  config files, and directory structure.
- Styling approach: Tailwind (which major version), CSS Modules, plain CSS, CSS-in-JS.
- Existing components that already solve part of the task (search by name and by role).
- Design tokens or theme files, and `.craft/` if present.
- Lint, type-check, test, and build scripts.
- Conventions: file naming, export style, prop naming, test location.

Match what exists. A new pattern needs a reason.

## 2. Respect the framework

- Never force a migration (CSS approach, router, state library, component library).
- Never replace a working design system; extend it.
- Do not add dependencies for what the platform or existing dependencies already do. If a
  dependency is warranted, say why and ask.
- Follow the framework's idioms: server components and `next/image` in Next.js, scoped styles
  in Vue and Svelte, islands in Astro.

## 3. Semantic, typed, composable

- Semantic HTML first (see the `accessibility` reference).
- Types where the project uses them; no `any` to silence errors.
- Small components with clear props; composition over boolean-flag explosions.
- Styles come from tokens (CSS variables or the Tailwind theme mapped to tokens).
- Keep side effects out of render; clean up listeners, observers, and timers.

## 4. States and data

Every data-driven view handles: loading, empty, error (with retry), partial data, success,
and permission-denied where relevant. Async actions prevent double submission and show
progress. Avoid layout shift when data arrives (reserve space).

## 5. Performance

Budgets to respect unless the contract sets others:

- Core Web Vitals at the "good" thresholds: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (75th
  percentile, mobile). Do not claim them without a measurement.
- Ship less JavaScript: server-render static content; lazy-load below-the-fold widgets;
  avoid importing whole libraries for one function.
- Images: correct size, modern format, dimensions set, LCP image prioritized.
- Fonts: few files, subset, preloaded only when critical, `font-display` set.
- Lists of hundreds of items: paginate or virtualize.
- Avoid layout thrashing in event handlers; debounce expensive input work.

## 6. Project checks (Tier 1)

Detect the project's own checks from `package.json` scripts and config files; never invent
commands. Typical names: `lint`, `typecheck` or `type-check`, `test`, `build`. Run the ones
that exist, record the exact command and the result. If a command does not exist, report
"not available" rather than substituting your own.

`craft audit` (v0.2) automates detection and records the results in the report.

## 7. Change hygiene

- Smallest change that solves the task; no drive-by refactors.
- Keep diffs reviewable; explain non-obvious decisions in the commit or PR, and design
  decisions in `.craft/decisions.md`.
- Remove dead code and unused tokens you introduced.
- Never commit secrets, generated reports in `.craft/reports/`, or build output.
