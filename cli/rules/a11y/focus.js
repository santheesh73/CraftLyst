import { baseClass } from '../../src/rule-helpers.js';

/** @type {import('../types.js').Rule} */
export default {
  id: 'a11y/focus',
  description: 'outline: none/0 (or outline-none) without a :focus-visible replacement.',
  severity: 'block',
  confidence: 0.8,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    const replacements = ctx.docs.some((d) => d.css.some((c) => c.rules.some((r) => /:focus-visible|:focus-within/.test(r.selector) && r.decls.some((x) => /^(outline|outline-style|outline-width|box-shadow|border|border-color|text-decoration)$/.test(x.prop) && !/^(none|0)$/.test(x.value.trim())))));
    for (const doc of ctx.docs) {
      if (doc.isTest) continue;
      for (const css of doc.css) {
        for (const r of css.rules) {
          const kill = r.decls.find((d) => (d.prop === 'outline' && /^(none|0|0px)(\s|$)/.test(d.value.trim())) || (d.prop === 'outline-style' && d.value.trim() === 'none'));
          if (!kill) continue;
          if (/:focus-visible/.test(r.selector) && !/:not\(:focus-visible\)/.test(r.selector)) continue;
          if (/:focus:not\(:focus-visible\)/.test(r.selector)) continue;
          const sameRuleReplacement = r.decls.some((d) => (d.prop === 'box-shadow' && d.value.trim() !== 'none') || /^border(-color)?$/.test(d.prop));
          if (sameRuleReplacement && /:focus/.test(r.selector)) continue;
          if (replacements) continue;
          out.push({ file: doc.file, line: kill.line, message: `"${r.selector}" removes the focus outline and the project defines no :focus-visible replacement.`, remediation: 'Add a visible :focus-visible style (outline: 2px solid var(--color-focus); outline-offset: 2px).' });
        }
      }
      for (const el of doc.all) {
        const cls = el.classes;
        const kill = cls.find((c) => /^(focus:|focus-visible:)?outline-(none|hidden|0)$/.test(c));
        if (!kill || el.classDynamic && !cls.length) continue;
        const replaced = cls.some((c) => /^(focus-visible|focus|group-focus-visible|peer-focus-visible):(ring|outline|shadow|border|underline)/.test(c) && !/outline-(none|hidden)/.test(c)) || cls.some((c) => baseClass(c).startsWith('ring') && c.startsWith('focus'));
        if (!replaced && !replacements) {
          out.push({ file: doc.file, line: el.line, message: `<${el.tag}> uses ${kill} without a focus-visible ring or outline.`, remediation: 'Add focus-visible:ring-2 (or an outline) using the focus color token.', confidence: 0.75 });
        }
      }
    }
    return out;
  }
};
