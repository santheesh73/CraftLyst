import { checkPairs } from '../../src/tokens.js';
import { parseColor, contrastRatio } from '../../src/color.js';
import { tailwindArbitrary } from '../../src/rule-helpers.js';

/** @type {import('../types.js').Rule} */
export default {
  id: 'a11y/contrast',
  description: 'Token foreground/background pairs (and literal same-rule color pairs) below WCAG AA.',
  severity: 'block',
  confidence: 0.95,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    if (ctx.tokens) {
      for (const r of checkPairs(ctx.tokens)) {
        if (r.status === 'fail') {
          out.push({ file: '.craft/tokens.json', message: `${r.pair.fg} on ${r.pair.bg} (${r.theme}) is ${r.ratio}:1; ${r.pair.use} needs ${r.required}:1.`, remediation: 'Adjust the primitive the semantic token points to, then rerun craft contrast.', confidence: 1 });
        }
      }
    }
    /**
     * @param {string} file
     * @param {number} line
     * @param {string} fg
     * @param {string} bg
     * @param {string} where
     */
    const pair = (file, line, fg, bg, where) => {
      const f = parseColor(fg);
      const b = parseColor(bg);
      if (!f || !b || b.a < 1) return;
      const ratio = contrastRatio(f, b);
      if (ratio < 4.5) out.push({ file, line, message: `${where}: ${fg} on ${bg} is ${ratio}:1 (text needs 4.5:1, large text 3:1).`, remediation: 'Use token pairs checked by craft contrast.', confidence: ratio < 3 ? 0.85 : 0.6 });
    };
    for (const doc of ctx.docs) {
      for (const css of doc.css) {
        for (const r of css.rules) {
          const fg = r.decls.find((d) => d.prop === 'color');
          const bg = r.decls.find((d) => d.prop === 'background-color' || (d.prop === 'background' && /^#|^rgb|^hsl|^oklch|^[a-z]+$/i.test(d.value.trim())));
          if (fg && bg) pair(doc.file, fg.line, fg.value.trim(), bg.value.trim(), `"${r.selector}"`);
        }
      }
      for (const el of doc.all) {
        const fgCls = el.classes.map(tailwindArbitrary).find((t) => t && t.utility === 'text' && t.variants.length === 0 && parseColor(t.value));
        const bgCls = el.classes.map(tailwindArbitrary).find((t) => t && t.utility === 'bg' && t.variants.length === 0 && parseColor(t.value));
        if (fgCls && bgCls) pair(doc.file, el.line, fgCls.value, bgCls.value, `<${el.tag}>`);
        const fg = el.styleDecls.find((d) => d.prop === 'color');
        const bg = el.styleDecls.find((d) => d.prop === 'background-color' || d.prop === 'background');
        if (fg && bg) pair(doc.file, fg.line, fg.value, bg.value, `<${el.tag}> inline style`);
      }
    }
    return out;
  }
};
