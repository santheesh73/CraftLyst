import { tailwindArbitrary, TEMPLATE_INCLUDE, isHiddenOrDecorative } from '../../src/rule-helpers.js';

/** @type {import('../types.js').Rule} */
export default {
  id: 'rsp/viewport',
  description: 'Missing or zoom-blocking meta viewport; fixed widths that force horizontal overflow.',
  severity: 'warn',
  confidence: 0.7,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    for (const doc of ctx.docs) {
      if (doc.isTest) continue;
      if (doc.kind === 'html' && doc.isDocument) {
        const meta = doc.all.find((e) => e.tag === 'meta' && e.attrs.name?.value === 'viewport');
        // A template that pulls its <head> from a partial may define the viewport there.
        if (!meta && !TEMPLATE_INCLUDE.test(doc.source)) out.push({ file: doc.file, line: 1, message: 'No <meta name="viewport">.', remediation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', confidence: 0.95 });
      }
      for (const el of doc.all) {
        if (el.tag === 'meta' && el.attrs.name?.value === 'viewport' && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(el.attrs.content?.value ?? '')) {
          out.push({ file: doc.file, line: el.line, message: 'Viewport meta blocks zoom.', remediation: 'Remove user-scalable=no and maximum-scale=1; users must be able to zoom (WCAG 1.4.4).', confidence: 0.95 });
        }
        for (const c of el.classes) {
          const tw = tailwindArbitrary(c);
          if (tw && tw.variants.length === 0 && /^(w|min-w)$/.test(tw.utility)) {
            const n = /^(\d+)px$/.exec(tw.value);
            // Hidden below a breakpoint (hidden lg:block) or decorative (aria-hidden) boxes cannot overflow the small viewport's content.
            if (n && Number(n[1]) > 360 && !isHiddenOrDecorative(el)) out.push({ file: doc.file, line: el.line, message: `Fixed width ${c} exceeds a 320px viewport.`, remediation: 'Use max-w-[...] with w-full, or a responsive variant (md:w-[...]).', confidence: 0.55 });
          }
        }
      }
      for (const css of doc.css) {
        for (const r of css.rules) {
          if (r.media.some((m) => /min-width/.test(m))) continue;
          const w = r.decls.find((d) => /^(width|min-width)$/.test(d.prop) && /^\d+px$/.test(d.value.trim()) && Number.parseInt(d.value, 10) > 360);
          if (w && !r.decls.some((d) => d.prop === 'max-width')) {
            out.push({ file: doc.file, line: w.line, message: `"${r.selector}" sets ${w.prop}: ${w.value} outside a min-width media query.`, remediation: 'Use max-width with width: 100%, or move the fixed width into a min-width media query.', confidence: 0.5 });
          }
        }
      }
    }
    return out;
  }
};
