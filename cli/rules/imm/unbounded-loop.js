const LOOP = /requestAnimationFrame\(|useFrame\(|setAnimationLoop\(|ticker\.add\(|\.onBeforeRenderObservable|engine\.runRenderLoop/;
const PAUSE = /visibilitychange|document\.hidden|IntersectionObserver|frameloop\s*=|useInView|inView|cancelAnimationFrame|setAnimationLoop\(\s*null/;
const DPR = /setPixelRatio\(\s*Math\.min|dpr\s*=\s*\{?\s*\[|devicePixelRatio\s*,\s*\d|Math\.min\(\s*(window\.)?devicePixelRatio|AdaptiveDpr|maxDpr|resolution\s*:\s*Math\.min/;
const BUDGET = /delta|clock\.getDelta|performance\.now|PerformanceMonitor|frameBudget|fps|targetFps|deltaTime|elapsed/i;

/** @type {import('../types.js').Rule} */
export default {
  id: 'imm/unbounded-loop',
  description: 'Render loops with no visibility pause, no device-pixel-ratio clamp, or no frame budget.',
  severity: 'warn',
  confidence: 0.55,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    for (const doc of ctx.docs) {
      if (doc.isTest || doc.kind === 'css') continue;
      const src = doc.scripts.join('\n') || doc.source;
      const m = LOOP.exec(src);
      if (!m) continue;
      const scene = /three|@react-three|pixi|babylon|ogl|regl|getContext\(/.test(src);
      if (!scene) continue;
      const missing = [];
      if (!PAUSE.test(src)) missing.push('visibility pause');
      if (!DPR.test(src) && /WebGLRenderer|<Canvas|Renderer\(|getContext\(\s*['"]webgl/.test(src)) missing.push('DPR clamp');
      if (!BUDGET.test(src)) missing.push('frame budget');
      if (missing.length) {
        const line = src.slice(0, m.index).split('\n').length;
        out.push({ file: doc.file, line, message: `Render loop without ${missing.join(', ')}.`, remediation: 'Pause when hidden or offscreen, clamp devicePixelRatio (for example Math.min(dpr, 2)), and scale work by frame delta.' });
      }
    }
    return out;
  }
};
