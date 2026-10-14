# Launch site for Orrery, a desktop planetarium app

Orrery is a fictional open-source desktop planetarium. The feature list is illustrative.

## Who it is for

Amateur astronomers and teachers who will download the app if the site convinces them it
is accurate and pleasant to use.

## What to build

A React + Vite site using three.js (directly or through @react-three/fiber) for one hero
scene: a slowly rotating, stylised model of the inner solar system that the visitor can
drag to orbit. Include `package.json` with `dev` and `build` scripts.

## Content

- Hero: "The sky tonight, from anywhere." with a Download button (links to `#download`) and
  a secondary "View the source" link (`#`).
- Three feature sections: Accurate ephemerides; Offline star catalogue; Classroom mode.
- Download section with three platform buttons (macOS, Windows, Linux) linking to `#`.
- Footer with the licence note "Released under the GPL-3.0 licence."

## Constraints

- The 3D scene has a static fallback (an image or SVG) when WebGL is unavailable and pauses
  under `prefers-reduced-motion`.
- Screen readers get a short description of the scene, not the canvas internals.
- Lazy-load the 3D code; the text content is readable before it loads.
- `npm run build` must succeed.
