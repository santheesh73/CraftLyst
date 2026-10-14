import { baseClass, hasColorLiteral, withoutVars, OG_IMAGE_FILE } from '../../src/rule-helpers.js';

/**
 * Blur radius of the largest shadow layer in a box-shadow/text-shadow value, if colored.
 * @param {string} value
 * @returns {number}
 */
function coloredBlur(value) {
  let max = 0;
  for (const layer of withoutVars(value).split(/,(?![^(]*\))/)) {
    if (!hasColorLiteral(layer)) continue;
    if (/rgba?\(\s*0\s*[, ]\s*0\s*[, ]\s*0|#000\b|#0000|black|hsla?\(\s*0\s*[, ]\s*0%/i.test(layer)) continue;
    const lengths = layer.replace(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\([^)]*\)/gi, ' ').replace(/#[0-9a-f]{3,8}\b/gi, ' ');
    const nums = [...lengths.matchAll(/(?:^|\s)(-?\d*\.?\d+)(px)?(?=\s|$)/g)].map((m) => Number(m[1]));
    const blur = nums.length >= 3 ? nums[2] : 0;
    max = Math.max(max, blur);
  }
  return max;
}

/** @type {import('../types.js').Rule} */
export default {
  id: 'vis/gradient-text',
  description: 'Gradient text (background-clip: text) or large colored glows without a token role.',
  severity: 'warn',
  confidence: 0.85,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    const glow = ctx.thresholds.glowBlurPx;
    for (const doc of ctx.docs) {
      if (doc.isTest || OG_IMAGE_FILE.test(doc.file)) continue;
      for (const css of doc.css) {
        for (const r of css.rules) {
          const clip = r.decls.find((d) => /^(-webkit-)?background-clip$/.test(d.prop) && /text/.test(d.value));
          const grad = r.decls.find((d) => /^background(-image)?$/.test(d.prop) && /gradient\(/.test(d.value) && !/^var\(/.test(d.value.trim()));
          if (clip && grad) out.push({ file: doc.file, line: clip.line, message: `Gradient text in "${r.selector}".`, remediation: 'Carry emphasis with type and a solid accent token; if the gradient is brand, make it a token with a role and add a craft-allow with the reason.' });
          for (const d of r.decls) {
            if ((d.prop === 'box-shadow' || d.prop === 'text-shadow') && coloredBlur(d.value) >= glow) {
              out.push({ file: doc.file, line: d.line, message: `Colored glow (${d.prop} blur ${coloredBlur(d.value)}px) in "${r.selector}".`, remediation: 'Use the elevation tokens; glows read as decoration and often hurt contrast.', confidence: 0.7 });
            }
          }
        }
      }
      for (const el of doc.all) {
        const cls = el.classes.map(baseClass);
        if (cls.includes('bg-clip-text') && cls.some((c) => /^(bg-gradient-to-|bg-linear-|bg-radial|bg-conic|from-)/.test(c))) {
          out.push({ file: doc.file, line: el.line, message: 'Gradient text via bg-clip-text and gradient utilities.', remediation: 'Use a solid text token; if the gradient is brand, give it a token role and a craft-allow reason.' });
        }
        for (const c of el.classes) {
          const m = /shadow-\[(.+)\]/.exec(c);
          if (m && coloredBlur(m[1].replace(/_/g, ' ')) >= glow) out.push({ file: doc.file, line: el.line, message: `Colored glow ${c}.`, remediation: 'Use elevation tokens instead of colored glows.', confidence: 0.7 });
        }
        if (el.styleDecls.some((d) => /^(-webkit-)?background-clip$/.test(d.prop) && /text/.test(d.value)) && el.styleDecls.some((d) => /gradient\(/.test(d.value))) {
          out.push({ file: doc.file, line: el.line, message: 'Inline gradient text.', remediation: 'Use a solid text token or a reasoned exception.' });
        }
      }
    }
    return out;
  }
};
