import { baseClass } from '../../src/rule-helpers.js';

const MOTION_LIBS = /^(framer-motion|motion|motion\/react|gsap|gsap\/.*|animejs|animejs\/.*|lottie-web|lottie-react|@lottiefiles\/.*|react-spring|@react-spring\/.*|aos|locomotive-scroll|lenis|@studio-freight\/lenis|swiper|swiper\/.*|embla-carousel.*|velocity-animate)$/;
const REDUCED_SIGNAL = /prefers-reduced-motion|useReducedMotion|reducedMotion|motion-reduce:|motion-safe:|matchMedia\([^)]*reduce/;

/** @type {import('../types.js').Rule} */
export default {
  id: 'mot/no-reduced',
  description: 'Animations, transitions, or animation libraries with no prefers-reduced-motion handling; autoplay and parallax are blocking.',
  severity: 'warn',
  confidence: 0.75,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    // A global reduced-motion reset (universal selector inside a reduce query) covers all CSS motion.
    const globalReset = ctx.docs.some((d) => d.css.some((c) => c.rules.some((r) => r.media.some((m) => /prefers-reduced-motion:\s*reduce/.test(m)) && /(^|,|\s)\*/.test(r.selector) && r.decls.some((x) => /animation|transition/.test(x.prop)))));
    const projectSignal = REDUCED_SIGNAL.test(ctx.text());
    for (const doc of ctx.docs) {
      if (doc.isTest) continue;
      const fileSignal = REDUCED_SIGNAL.test(doc.source);
      for (const css of doc.css) {
        if (globalReset || fileSignal) break;
        const moving = css.decls.find((d) => (/^(animation|animation-name)$/.test(d.prop) && !/^(none|initial|unset)$/.test(d.value.trim())) || (/^transition(-property)?$/.test(d.prop) && /transform|all|translate|scale|rotate|top|left|margin|width|height/.test(d.value)));
        if (moving) out.push({ file: doc.file, line: moving.line, message: `${moving.prop}: ${moving.value} with no prefers-reduced-motion handling in this file or a global reset.`, remediation: 'Wrap motion in @media (prefers-reduced-motion: no-preference), or add a global reduced-motion reset.' });
      }
      for (const css of doc.css) {
        for (const d of css.decls) {
          if (d.prop === 'background-attachment' && /fixed/.test(d.value)) out.push({ file: doc.file, line: d.line, severity: 'block', message: 'Parallax via background-attachment: fixed.', remediation: 'Remove parallax or disable it under prefers-reduced-motion: reduce.', confidence: 0.6 });
        }
      }
      if (!globalReset) {
        for (const el of doc.all) {
          const cls = el.classes;
          const anim = cls.find((c) => /^animate-(?!none)/.test(baseClass(c)) && !/^motion-(safe|reduce):/.test(c));
          const hasVariant = cls.some((c) => /^motion-(safe|reduce):/.test(c));
          if (anim && !hasVariant && !fileSignal) out.push({ file: doc.file, line: el.line, message: `Animation class ${anim} without a motion-safe: or motion-reduce: variant.`, remediation: `Use motion-safe:${baseClass(anim)} or add motion-reduce:animate-none.`, confidence: 0.7 });
        }
      }
      for (const el of doc.all) {
        if (el.tag === 'video' && ('autoplay' in el.attrs || 'autoPlay' in el.attrs) && !fileSignal) {
          out.push({ file: doc.file, line: el.line, severity: 'block', message: 'Autoplaying video with no reduced-motion handling.', remediation: 'Do not autoplay under prefers-reduced-motion: reduce; provide pause controls.', confidence: 0.8 });
        }
        if (/parallax/i.test(el.classes.join(' ') + el.tag) && !fileSignal) {
          out.push({ file: doc.file, line: el.line, severity: 'block', message: `Parallax element <${el.tag}> with no reduced-motion handling.`, remediation: 'Disable parallax under prefers-reduced-motion: reduce.', confidence: 0.6 });
        }
      }
      const libs = doc.imports.filter((i) => MOTION_LIBS.test(i));
      if (libs.length && !fileSignal && !projectSignal) {
        out.push({ file: doc.file, line: 1, message: `Uses ${[...new Set(libs)].join(', ')} with no reduced-motion handling anywhere in the project.`, remediation: 'Honor prefers-reduced-motion through the library (for example useReducedMotion or MotionConfig reducedMotion="user") or a matchMedia check.' });
      }
      if (/autoplay\s*[:=]\s*(\{|true|\{\s*delay)/i.test(doc.source) && libs.some((l) => /swiper|embla/.test(l)) && !fileSignal) {
        out.push({ file: doc.file, line: 1, severity: 'block', message: 'Autoplaying carousel with no reduced-motion handling.', remediation: 'Disable autoplay under prefers-reduced-motion and provide pause controls.', confidence: 0.6 });
      }
    }
    return out;
  }
};
