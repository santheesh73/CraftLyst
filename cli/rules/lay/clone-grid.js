import { visualTraits, isCardLike } from '../../src/rule-helpers.js';

/**
 * Shape of a block: icon/image, heading, and up to two short text lines.
 * @param {import('../types.js').Element} el
 * @returns {string | null}
 */
function signature(el) {
  /** @type {string[]} */
  const parts = [];
  /** @param {import('../types.js').Element} e */
  const walk = (e) => {
    for (const c of e.children) {
      if (c.tag === 'svg' || c.tag === 'img' || c.tag === 'Image' || c.tag === 'i' || /Icon$|^Icon/.test(c.tag)) parts.push('I');
      else if (/^h[1-6]$/.test(c.tag)) parts.push('H');
      else if (c.tag === 'p' || c.tag === 'span' || c.tag === 'small') parts.push('T');
      else if (/^(div|a|figure|header|footer)$/.test(c.tag)) walk(c);
      else parts.push('X');
    }
  };
  walk(el);
  const s = parts.join('');
  return /^I?HT{1,2}$|^IH$/.test(s) || /^HIT{1,2}$/.test(s) ? s : null;
}

/** @type {import('../types.js').Rule} */
export default {
  id: 'lay/clone-grid',
  description: 'Three or more sibling blocks with the same icon + heading + short text structure.',
  severity: 'warn',
  confidence: 0.6,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    const min = ctx.thresholds.cloneGridMin;
    for (const doc of ctx.docs) {
      if (doc.isTest) continue;
      /** @type {Set<import('../types.js').Element | null>} */
      const parents = new Set(doc.all.map((e) => e.parent));
      for (const parent of parents) {
        const kids = parent ? parent.children : doc.elements;
        /** @type {Map<string, import('../types.js').Element[]>} */
        const groups = new Map();
        for (const k of kids) {
          if (k.inLoop) continue;
          const sig = signature(k);
          if (!sig) continue;
          // Without an icon, heading + text siblings are FAQ entries, slides, or prose sections unless styled as cards.
          if (!sig.includes('I') && !isCardLike(visualTraits(k, ctx.classes))) continue;
          const key = `${k.tag}|${sig}`;
          groups.set(key, [...(groups.get(key) ?? []), k]);
        }
        for (const [key, els] of groups) {
          if (els.length >= min) {
            out.push({ file: doc.file, line: els[0].line, message: `${els.length} sibling <${els[0].tag}> blocks share the same structure (${key.split('|')[1].replace('I', 'icon ').replace('H', 'heading ').replace(/T/g, 'text ').trim()}).`, remediation: 'Weight items by importance, show the real product, or use a list. If the items are truly parallel (plans, steps), add a craft-allow with that reason.' });
          }
        }
      }
      // Mapped templates: one element rendered from an array literal of 3+ objects.
      for (const el of doc.all) {
        if (!el.inLoop || !signature(el)) continue;
        const near = doc.source.split('\n').slice(Math.max(0, el.line - 60), el.line).join('\n');
        const arrays = [...near.matchAll(/=\s*\[\s*(\{[\s\S]*?\})\s*\]/g)];
        const last = arrays[arrays.length - 1];
        if (last && (last[1].match(/\}\s*,\s*\{/g)?.length ?? 0) + 1 >= min) {
          out.push({ file: doc.file, line: el.line, message: `<${el.tag}> with icon + heading + text is rendered from a list of ${(last[1].match(/\}\s*,\s*\{/g)?.length ?? 0) + 1} items (likely a feature grid).`, remediation: 'Check the items deserve equal weight; otherwise lead with the most important one or show the real product.', confidence: 0.45 });
        }
      }
    }
    return out;
  }
};
