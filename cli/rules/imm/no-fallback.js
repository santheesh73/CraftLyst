import { createsScene } from './shared.js';

const NO_WEBGL = /WebGLRenderingContext|isWebGL2?Available|WebGL\.is|getContext\([^)]*\)\s*(\)|;)?\s*(if|\?\?|\|\||&&|==)|if\s*\(\s*!\s*(gl|ctx|context)\b|fallback\s*=|<noscript|ErrorBoundary|onCreated|webglcontextlost|catch\s*\(/;
const REDUCED = /prefers-reduced-motion|useReducedMotion|reducedMotion/;
const LOW_POWER = /powerPreference|frameloop\s*=\s*['"{]?\s*['"]?demand|PerformanceMonitor|AdaptiveDpr|AdaptiveEvents|hardwareConcurrency|deviceMemory|saveData|getBattery|setPixelRatio\(\s*Math\.min|dpr\s*=\s*\{\s*\[/;

/** @type {import('../types.js').Rule} */
export default {
  id: 'imm/no-fallback',
  description: 'WebGL/canvas scenes without no-WebGL, reduced-motion, and low-power paths.',
  severity: 'block',
  confidence: 0.6,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    const project = ctx.text();
    for (const doc of ctx.docs) {
      // Judge the file that creates the scene; components rendered inside it inherit its fallbacks.
      if (!createsScene(doc)) continue;
      const src = doc.source;
      const missing = [];
      if (!NO_WEBGL.test(src)) missing.push('no-WebGL fallback');
      if (!REDUCED.test(src) && !REDUCED.test(project)) missing.push('reduced-motion path');
      if (!LOW_POWER.test(src) && !LOW_POWER.test(project)) missing.push('low-power path');
      if (missing.length) {
        out.push({ file: doc.file, line: 1, message: `3D/WebGL scene without ${missing.join(', ')}.`, remediation: 'Feature-detect WebGL and render a static fallback; stop camera motion and autoplay under prefers-reduced-motion; clamp DPR and degrade on low-power devices.', severity: missing.includes('no-WebGL fallback') || missing.includes('reduced-motion path') ? 'block' : 'warn' });
      }
    }
    return out;
  }
};
