import { hasAccessibleName, isIllustrative } from '../../src/rule-helpers.js';

/** @type {import('../types.js').Rule} */
export default {
  id: 'a11y/alt',
  description: 'Images without alt; icon-only buttons and links without an accessible name.',
  severity: 'block',
  confidence: 0.85,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    for (const doc of ctx.docs) {
      if (doc.isTest) continue;
      for (const el of doc.all) {
        if ((el.tag === 'img' || el.tag === 'Image') && !('alt' in el.attrs) && !el.hasSpread) {
          if (el.attrs['aria-hidden']?.value === 'true' || el.attrs.role?.value === 'presentation') continue;
          out.push({ file: doc.file, line: el.line, message: `<${el.tag}> has no alt attribute.`, remediation: 'Add alt text that conveys the information, or alt="" if the image is decorative.' });
          continue;
        }
        if (el.tag === 'button' || (el.tag === 'a' && 'href' in el.attrs)) {
          if (el.attrs['aria-hidden']?.value === 'true' || isIllustrative(el)) continue;
          const named = hasAccessibleName(el);
          if (named === false && el.children.length > 0) {
            out.push({ file: doc.file, line: el.line, message: `Icon-only <${el.tag}> has no accessible name.`, remediation: 'Add aria-label, or visually hidden text inside the control.' });
          }
        }
      }
    }
    return out;
  }
};
