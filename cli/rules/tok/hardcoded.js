import { COLOR_PROPS, SPACING_PROPS, FONT_SIZE_PROPS, colorLiterals, lengthLiterals, tailwindArbitrary, TW_COLOR_UTILS, TW_SPACING_UTILS, hasColorLiteral } from '../../src/rule-helpers.js';

/** Files that define tokens are allowed to contain literals. */
const TOKEN_FILE = /(^|\/)(tokens?|theme|variables|design-tokens)\.(css|scss|pcss)$|tailwind\.config\./;

/** @type {import('../types.js').Rule} */
export default {
  id: 'tok/hardcoded',
  description: 'Literal colors, spacing, or font sizes that are not design tokens.',
  severity: 'warn',
  confidence: 0.85,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    const known = ctx.tokenValues;
    /** @param {string} v */
    const isToken = (v) => known.has(v.trim().toLowerCase());
    for (const doc of ctx.docs) {
      if (TOKEN_FILE.test(doc.file) || doc.isTest) continue;
      for (const css of doc.css) {
        for (const d of css.decls) {
          if (d.prop.startsWith('--')) continue;
          if (d.rule && /^@(theme|font-face|property|keyframes)/.test(d.rule.selector)) continue;
          if (d.rule && /^:root\b|^html\b/.test(d.rule.selector) && d.prop.startsWith('--')) continue;
          const lits = [
            ...(COLOR_PROPS.has(d.prop) ? colorLiterals(d.value) : []),
            ...(SPACING_PROPS.has(d.prop) || FONT_SIZE_PROPS.has(d.prop) ? lengthLiterals(d.value) : [])
          ].filter((v) => !isToken(v));
          if (lits.length) {
            out.push({
              file: doc.file, line: d.line, column: d.column,
              message: `${d.prop}: ${d.value} uses literal ${[...new Set(lits)].join(', ')} instead of a token.`,
              remediation: 'Use a semantic token (var(--...)) or add the value to .craft/tokens.json with a role.'
            });
          }
        }
      }
      for (const el of doc.all) {
        for (const d of el.styleDecls) {
          if (d.prop.startsWith('--')) continue;
          const lits = [
            ...(COLOR_PROPS.has(d.prop) ? colorLiterals(d.value) : []),
            ...(SPACING_PROPS.has(d.prop) || FONT_SIZE_PROPS.has(d.prop) ? lengthLiterals(d.value) : [])
          ].filter((v) => !isToken(v));
          if (lits.length) {
            out.push({ file: doc.file, line: d.line, message: `Inline style ${d.prop}: ${d.value} uses a literal value.`, remediation: 'Move the value to a token and reference it with var(--...) or a token-backed class.', confidence: 0.9 });
          }
        }
        for (const cls of el.classes) {
          const tw = tailwindArbitrary(cls);
          if (!tw || /var\(|^--/.test(tw.value) || tw.value.startsWith('theme(')) continue;
          const isColor = TW_COLOR_UTILS.has(tw.utility) && hasColorLiteral(tw.value);
          const isSpace = (TW_SPACING_UTILS.has(tw.utility) || (tw.utility === 'text' && /^\d/.test(tw.value))) && lengthLiterals(tw.value).length > 0;
          if ((isColor || isSpace) && !isToken(tw.value)) {
            out.push({ file: doc.file, line: el.line, message: `Tailwind arbitrary value ${cls} is not a token.`, remediation: 'Map the value to a theme key backed by a token (for example bg-surface or p-4) instead of an arbitrary value.', confidence: 0.8 });
          }
        }
      }
    }
    return out;
  }
};
