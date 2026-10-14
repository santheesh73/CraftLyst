import { TEMPLATE_INCLUDE } from '../../src/rule-helpers.js';

/**
 * A click handler that is a convenience around real controls (event delegation over links or
 * buttons) or a modal backdrop (closed by Escape too) is not a keyboard trap.
 * @param {import('../types.js').Element} el
 */
function delegates(el) {
  if (/(^|[\s_-])(backdrop|overlay|scrim|mask)($|[\s_-])/i.test(el.classes.join(' '))) return true;
  /** @param {import('../types.js').Element} e @returns {boolean} */
  // Items rendered in a loop by components (<FilterItem> per entry) are treated as controls too.
  const hasControl = (e) => e.children.some((c) => /^(a|button|input|select|textarea|summary)$/.test(c.tag) || /^[A-Z]\w*(Link|Button)$|^(Link|Button|RouterLink|NuxtLink)$/.test(c.tag) || (c.inLoop && /^[A-Z]/.test(c.tag)) || hasControl(c));
  return hasControl(el);
}

/** @type {import('../types.js').Rule} */
export default {
  id: 'a11y/semantics',
  description: 'Clickable div/span without role and keyboard support, heading-level skips, missing lang, missing main landmark.',
  severity: 'warn',
  confidence: 0.7,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    for (const doc of ctx.docs) {
      if (doc.isTest) continue;
      for (const el of doc.all) {
        if ((el.tag === 'div' || el.tag === 'span' || el.tag === 'li' || el.tag === 'img') && 'onClick' in el.attrs && !delegates(el)) {
          const role = el.attrs.role?.value;
          const keyboard = 'onKeyDown' in el.attrs || 'onKeyUp' in el.attrs || 'onKeyPress' in el.attrs;
          const focusable = 'tabIndex' in el.attrs;
          if (!role || !keyboard || !focusable) {
            out.push({ file: doc.file, line: el.line, message: `Clickable <${el.tag}> without ${[!role && 'a role', !focusable && 'tabIndex', !keyboard && 'keyboard handling'].filter(Boolean).join(', ')}.`, remediation: 'Use a <button> (or <a href> for navigation) instead of a clickable container.', confidence: 0.85 });
          }
        }
      }
      // Heading order within one file, in source order.
      const headings = doc.all.filter((e) => /^h[1-6]$/.test(e.tag)).sort((a, b) => a.line - b.line || a.column - b.column);
      for (let i = 1; i < headings.length; i++) {
        const prev = Number(headings[i - 1].tag[1]);
        const cur = Number(headings[i].tag[1]);
        if (cur > prev + 1) {
          out.push({ file: doc.file, line: headings[i].line, message: `Heading level skips from h${prev} to h${cur}.`, remediation: `Use h${prev + 1}, and style it to the size you need.`, confidence: 0.6 });
        }
      }
      if (doc.isDocument || doc.all.some((e) => e.tag === 'html')) {
        const html = doc.all.find((e) => e.tag === 'html');
        if (html && !('lang' in html.attrs)) out.push({ file: doc.file, line: html.line, message: '<html> has no lang attribute.', remediation: 'Add lang (for example lang="en") so assistive technology uses the right pronunciation.', confidence: 0.95 });
        // An SPA shell (<div id="root"></div> and nothing else) gets its landmarks from the app.
        const shell = doc.all.some((e) => /^(root|app|__next|__nuxt|svelte|q-app)$/.test(e.attrs.id?.value ?? '') && e.children.length === 0) || /%[\w.]+%|<!--\s*(app-html|ssr-outlet)\s*-->/.test(doc.source) || TEMPLATE_INCLUDE.test(doc.source);
        if (doc.kind === 'html' && !shell && !doc.all.some((e) => e.tag === 'main' || e.attrs.role?.value === 'main')) {
          out.push({ file: doc.file, line: html?.line ?? 1, message: 'Page has no <main> landmark.', remediation: 'Wrap the primary content in <main>.', confidence: 0.8 });
        }
      }
    }
    return out;
  }
};
