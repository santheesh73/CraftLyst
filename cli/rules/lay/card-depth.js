import { visualTraits, isCardLike, INTERACTIVE_COMPONENT } from '../../src/rule-helpers.js';

const OVERLAY = /dropdown|popover|tooltip|menu|modal|dialog|drawer|toast|listbox|combobox/i;

/**
 * Floating layers (menus, popovers, tooltips, dialogs, absolutely positioned panels) sit above content, not nested in it.
 * @param {import('../types.js').Element} el
 */
const isOverlay = (el) => OVERLAY.test(`${el.tag} ${el.attrs.id?.value ?? ''} ${el.attrs.role?.value ?? ''}`) || el.classes.some((c) => OVERLAY.test(c) || c === 'absolute' || c === 'fixed');

/** @type {import('../types.js').Rule} */
export default {
  id: 'lay/card-depth',
  description: 'Card-like containers nested more than one level, or cards making up most page sections.',
  severity: 'warn',
  confidence: 0.65,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    const maxDepth = ctx.thresholds.cardDepth;
    for (const doc of ctx.docs) {
      if (doc.isTest) continue;
      /** @type {Map<import('../types.js').Element, boolean>} */
      const card = new Map();
      // Controls (buttons, links, inputs) have borders and padding but are not containers.
      // Inline badges are not containers, and menus, popovers, tooltips, and dialogs float above the card they sit in.
      for (const el of doc.all) {
        const name = el.tag.split('.').pop() ?? '';
        const control = /^(button|a|input|select|textarea|label|summary|span|small|em|strong|code|kbd|mark|abbr|td|th|dialog|Badge)$/.test(name) || (/^[A-Z]/.test(name) && INTERACTIVE_COMPONENT.test(name)) || /^motion\.(button|a|input)$/.test(el.tag);
        card.set(el, !control && !isOverlay(el) && isCardLike(visualTraits(el, ctx.classes)));
      }
      for (const el of doc.all) {
        if (!card.get(el)) continue;
        let depth = 1;
        for (let p = el.parent; p; p = p.parent) if (card.get(p)) depth++;
        if (depth === maxDepth + 1) {
          out.push({ file: doc.file, line: el.line, message: `Card nested ${depth} levels deep (<${el.tag}> inside another card-like container).`, remediation: 'Group inner content with spacing, dividers, or headings; keep cards for discrete, selectable objects.' });
        }
      }
      const sections = doc.all.filter((e) => e.tag === 'section' || (e.parent?.tag === 'main' && /^(div|article|section)$/.test(e.tag)));
      if (sections.length >= 3) {
        const carded = sections.filter((s) => card.get(s) || s.children.length > 0 && s.children.every((c) => card.get(c)));
        const share = carded.length / sections.length;
        if (share > ctx.thresholds.cardShare) {
          out.push({ file: doc.file, line: sections[0].line, message: `${carded.length} of ${sections.length} sections are wrapped in cards (${Math.round(share * 100)}% > ${Math.round(ctx.thresholds.cardShare * 100)}%).`, remediation: 'Use whitespace, background bands, or headings to separate sections; reserve cards for objects.', confidence: 0.55 });
        }
      }
    }
    return out;
  }
};
