import { baseClass, INTERACTIVE_COMPONENT } from '../../src/rule-helpers.js';

const REPLACEMENT = /^(?:[\w-]+:)*(focus|focus-visible|focus-within|group-focus-visible|peer-focus-visible|data-\[highlighted\]|data-highlighted|data-\[selected[^\]]*\]|aria-selected|data-\[state=(open|on|checked|active)\]):(ring|outline|shadow|border|underline|decoration|bg|text)/;
const INTERACTIVE_TAG = /^(a|button|input|select|textarea|summary|area)$/;

/**
 * Focus can land here: native controls, tabindex, widget roles, or components named like controls.
 * Containers such as popover or dialog content are focused programmatically and need no ring.
 * @param {import('../types.js').Element} el
 */
function isFocusable(el) {
  if (INTERACTIVE_TAG.test(el.tag) || 'tabIndex' in el.attrs || 'contentEditable' in el.attrs || 'contenteditable' in el.attrs) return true;
  if (/^(button|link|tab|menuitem|menuitemcheckbox|menuitemradio|option|checkbox|radio|switch|slider|textbox|combobox|treeitem|gridcell)$/.test(el.attrs.role?.value ?? '')) return true;
  const name = el.tag.split('.').pop() ?? '';
  return /^[A-Z]/.test(name) && INTERACTIVE_COMPONENT.test(name);
}

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
          // Only resets that apply while an element has focus matter: plain element/class resets
          // or :focus selectors. :hover/:active-only rules and links without href are not focus.
          if (!/:focus/.test(r.selector) && /:(hover|active|checked|disabled)\b/.test(r.selector)) continue;
          if (r.selector.split(',').every((sel) => /a:not\(\[href\]\)/.test(sel))) continue;
          // A :focus rule that swaps in another visible change (background, border, shadow, underline) replaces the outline.
          if (/:focus/.test(r.selector) && r.decls.some((x) => /^(background|background-color|border|border-color|border-bottom|box-shadow|text-decoration|color)$/.test(x.prop) && !/^(none|0|transparent|inherit)$/.test(x.value.trim()))) continue;
          if (/:focus:not\(:focus-visible\)/.test(r.selector)) continue;
          if (replacements) continue;
          out.push({ file: doc.file, line: kill.line, message: `"${r.selector}" removes the focus outline and the project defines no :focus-visible replacement.`, remediation: 'Add a visible :focus-visible style (outline: 2px solid var(--color-focus); outline-offset: 2px).' });
        }
      }
      for (const el of doc.all) {
        const cls = el.classes;
        const kill = cls.find((c) => /^(focus:|focus-visible:)?outline-(none|hidden|0)$/.test(c));
        if (!kill || el.classDynamic && !cls.length) continue;
        if (!isFocusable(el)) continue;
        // Any visible change on focus (or on the highlighted state menus use for keyboard focus) counts.
        const replaced = cls.some((c) => REPLACEMENT.test(c) && !/outline-(none|hidden|0)$/.test(c));
        if (!replaced && !replacements) {
          // A component (<Input>, <Button>) may add its own focus ring internally, which lint cannot see.
          const component = !/^[a-z]/.test(el.tag.split('.').pop() ?? '');
          out.push({ file: doc.file, line: el.line, message: `<${el.tag}> uses ${kill} without a focus-visible ring or outline${component ? ' here (the component may add its own)' : ''}.`, remediation: 'Add focus-visible:ring-2 (or an outline) using the focus color token.', confidence: component ? 0.4 : 0.75, ...(component ? { severity: /** @type {const} */ ('info') } : {}) });
        }
      }
    }
    return out;
  }
};
