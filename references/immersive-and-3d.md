# Immersive and 3D

WebGL, canvas, and scroll-driven scenes: budgets, degradation, fallbacks, and
accessibility. Immersive work is held to the same "done" as any other interface.

## Contents

1. [Decide if it earns its cost](#1-decide-if-it-earns-its-cost)
2. [Performance budgets](#2-performance-budgets)
3. [Device tiers and degradation](#3-device-tiers-and-degradation)
4. [Mandatory fallbacks](#4-mandatory-fallbacks)
5. [Accessibility over canvas](#5-accessibility-over-canvas)
6. [Loading strategy and LCP](#6-loading-strategy-and-lcp)
7. [Render loop discipline](#7-render-loop-discipline)
8. [Lint rules](#8-lint-rules)

## 1. Decide if it earns its cost

A 3D or canvas scene is justified when it shows something words and images cannot (a
product's form, spatial data, an interactive simulation) or when it is the direction's
signature move with `motion: expressive`. It is not justified as background decoration on
a task-focused page. Record the reason in `decisions.md`.

## 2. Performance budgets

Starting budgets; set project-specific ones in the contract:

| Budget | Target |
|---|---|
| Frame time | ≤ 16.7 ms (60 fps) on mid-tier devices; degrade before dropping below 30 fps |
| Draw calls | ≤ 100 per frame on mobile, ≤ 300 on desktop (merge and instance) |
| Scene JavaScript | ≤ 150 kB gzipped beyond the page's baseline, loaded after first paint |
| Assets | ≤ 2–3 MB for the initial scene on mobile; compressed geometry and textures |
| Textures | power-of-two sizes; GPU-compressed formats where the pipeline supports them; ≤ 2048 px on mobile |
| Device pixel ratio | clamp to 1.5–2 |

Measure on a real mid-tier phone or with CPU and GPU throttling. Do not claim budgets are
met without measurement.

## 3. Device tiers and degradation

Classify at startup with cheap signals (WebGL capability, `navigator.hardwareConcurrency`,
`deviceMemory` where available, a short frame-time probe) and choose a tier:

- **High**: full scene, post-processing, shadows.
- **Mid**: reduced resolution and DPR, no post-processing, baked lighting.
- **Low / no WebGL**: static image or video poster plus DOM content.

Re-tier at runtime if sustained frame time exceeds the budget. Respect battery and data
saver hints (`navigator.connection.saveData`) where available.

## 4. Mandatory fallbacks

Every scene ships three paths (`imm/no-fallback`, block):

1. **No WebGL**: feature-detect and render the fallback; never a blank canvas or an error.
2. **Reduced motion**: no camera travel, auto-rotation, or scroll-jacking; a still frame or
   user-controlled motion only.
3. **Low power**: the low tier above, also used when the tab is hidden or the device is constrained.

## 5. Accessibility over canvas

- Meaningful content inside the canvas has a DOM equivalent: headings, text, and controls
  that exist in the document (`imm/no-dom-text`). A canvas is invisible to screen readers.
- Decorative canvases get `aria-hidden="true"` and no focus.
- Interactive scenes offer keyboard controls (documented on screen), visible focus for DOM
  controls, and a skip link past the scene.
- Do not trap scroll or keyboard focus inside the scene.
- Text overlaid on a scene needs a contrast-safe scrim; verify rendered.

## 6. Loading strategy and LCP

- The LCP element should be DOM content (heading or poster image), not the WebGL canvas.
- Render a poster image or static frame immediately; load the scene after first paint
  (dynamic import on idle or on visibility).
- Show progress for heavy loads, and let the user use the page meanwhile.
- Preload only what the first frame needs; stream the rest.

## 7. Render loop discipline

```js
let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(tick); });
const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(tick); });
io.observe(canvas);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
function tick(t) {
  if (!running) return;
  // update and render within the frame budget; skip work when nothing changed
  requestAnimationFrame(tick);
}
```

- Pause when hidden or offscreen; clamp DPR; render on demand for static scenes.
- Dispose geometries, materials, and textures when the scene unmounts.
- Avoid allocating objects inside the loop.

## 8. Lint rules

- `imm/no-fallback` (block): WebGL or canvas without no-WebGL, reduced-motion, or low-power paths.
- `imm/no-dom-text` (warn): meaningful canvas content without DOM text alternative.
- `imm/unbounded-loop` (warn): a render loop with no visibility pause, no DPR clamp, or no frame budget.
