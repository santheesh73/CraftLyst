import { COLOR_PROPS, SPACING_PROPS, FONT_SIZE_PROPS, colorLiterals, lengthLiterals, tailwindArbitrary, TW_COLOR_UTILS, TW_SPACING_UTILS, hasColorLiteral, withoutVars, OG_IMAGE_FILE, SYNTAX_THEME_FILE } from '../../src/rule-helpers.js';

/** Files that define tokens are allowed to contain literals. */
const TOKEN_FILE = /(^|\/)(tokens?|theme|variables|design-tokens)\.(css|scss|pcss)$|tailwind\.config\./;

/** Names of a scale step (--space-4, --spacing-md, --text-lg, --font-size-2), not one component's size. */
const STEP = '(\\d+|[0-9]*x?[sml]|xs|sm|base|md|lg|\\d*xl)$';
const STEP_SPACE = new RegExp(`(^--|-)(space|spacing|gap|gutter|size)-${STEP}`);
const STEP_SIZE = new RegExp(`(^--|-)(font-size|text|fs|step|type)-(${STEP.slice(0, -1)}|h[1-6]|body|small|lead|display)$`);

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
    // Literals are only drift when the project has tokens for that kind of value. Without them,
    // one informational summary per kind replaces a warning per declaration.
    // A token kind exists when tokens.json has it or the CSS defines a scale (3+ custom
    // properties whose values are of that kind).
    // Each directory with its own index.html is a separate site (a repo of demos or examples);
    // its tokens are judged on their own. Everything else belongs to the project root.
    const siteRoots = ctx.docs.filter((d) => /(^|\/)index\.html?$/.test(d.file)).map((d) => d.file.replace(/(^|\/)?index\.html?$/, '')).filter(Boolean);
    const scopeOf = (/** @type {string} */ file) => siteRoots.filter((r) => file.startsWith(`${r}/`)).sort((a, b) => b.length - a.length)[0] ?? '';
    /** @type {[string, string, string][]} */
    const defs = [];
    for (const d of ctx.docs) for (const c of d.css) for (const x of c.decls) if (x.prop.startsWith('--')) defs.push([x.prop, x.value.trim(), scopeOf(d.file)]);
    const isLength = (/** @type {string} */ v) => /^-?[\d.]+(px|rem|em)$|^clamp\(/.test(v);
    /** @param {string} scope @param {(n: string, v: string) => boolean} test */
    const count = (scope, test) => new Set(defs.filter(([n, v, s]) => (s === scope || s === '') && test(n, v)).map(([n]) => n)).size >= 3;
    /** @type {Map<string, Record<'color' | 'space' | 'size', boolean>>} */
    const hasByScope = new Map();
    const hasIn = (/** @type {string} */ scope) => {
      let h = hasByScope.get(scope);
      if (!h) {
        h = {
          color: Boolean(ctx.tokens?.primitive?.color) || count(scope, (_n, v) => colorLiterals(v).length > 0 && withoutVars(v).trim() === v),
          space: Boolean(ctx.tokens?.primitive?.space) || count(scope, (n, v) => STEP_SPACE.test(n) && isLength(v)),
          size: Boolean(ctx.tokens?.primitive?.fontSize) || count(scope, (n, v) => STEP_SIZE.test(n) && isLength(v))
        };
        hasByScope.set(scope, h);
      }
      return h;
    };
    /** @type {Record<'color' | 'space' | 'size', { count: number, file: string, line: number } | null>} */
    const untokened = { color: null, space: null, size: null };
    /**
     * @param {string} prop
     * @param {string} value
     * @param {string} file
     * @returns {{ flagged: string[], skipped: ('color' | 'space' | 'size')[] }}
     */
    const literals = (prop, value, file) => {
      const has = hasIn(scopeOf(file));
      /** @type {string[]} */
      const flagged = [];
      /** @type {('color' | 'space' | 'size')[]} */
      const skipped = [];
      /** @param {'color' | 'space' | 'size'} kind @param {string[]} lits */
      const take = (kind, lits) => {
        const real = lits.filter((v) => !isToken(v));
        if (!real.length) return;
        if (has[kind]) flagged.push(...real);
        else skipped.push(kind);
      };
      if (COLOR_PROPS.has(prop)) take('color', colorLiterals(value));
      // Lengths inside calc()/clamp()/min()/max() are parts of a formula, not standalone values.
      const formula = /\b(calc|clamp|min|max)\(/.test(value);
      if (SPACING_PROPS.has(prop) && !formula) take('space', lengthLiterals(value));
      if (FONT_SIZE_PROPS.has(prop) && !formula) take('size', lengthLiterals(value));
      return { flagged, skipped };
    };
    /** @param {('color' | 'space' | 'size')[]} kinds @param {string} file @param {number} line */
    const note = (kinds, file, line) => {
      for (const k of kinds) {
        const u = untokened[k];
        if (u) u.count++;
        else untokened[k] = { count: 1, file, line };
      }
    };
    for (const doc of ctx.docs) {
      if (TOKEN_FILE.test(doc.file) || doc.isTest || doc.isFixture || OG_IMAGE_FILE.test(doc.file) || SYNTAX_THEME_FILE.test(doc.file) || /(^|\/)print\.(css|scss)$/.test(doc.file)) continue;
      for (const css of doc.css) {
        for (const d of css.decls) {
          if (d.prop.startsWith('--')) continue;
          if (d.rule && /^@(theme|font-face|property|keyframes)/.test(d.rule.selector)) continue;
          if (d.rule?.media.some((m) => /print/.test(m))) continue;
          const { flagged, skipped } = literals(d.prop, d.value, doc.file);
          note(skipped, doc.file, d.line);
          if (flagged.length) {
            out.push({
              file: doc.file, line: d.line, column: d.column,
              message: `${d.prop}: ${d.value} uses literal ${[...new Set(flagged)].join(', ')} instead of a token.`,
              remediation: 'Use a semantic token (var(--...)) or add the value to .craft/tokens.json with a role.'
            });
          }
        }
      }
      for (const el of doc.all) {
        for (const d of el.styleDecls) {
          if (d.prop.startsWith('--')) continue;
          const { flagged, skipped } = literals(d.prop, d.value, doc.file);
          note(skipped, doc.file, d.line);
          if (flagged.length) {
            out.push({ file: doc.file, line: d.line, message: `Inline style ${d.prop}: ${d.value} uses a literal value.`, remediation: 'Move the value to a token and reference it with var(--...) or a token-backed class.', confidence: 0.9 });
          }
        }
        // Tailwind always has a theme scale, so arbitrary values are drift from it.
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
    const label = { color: 'color', space: 'spacing', size: 'font-size' };
    for (const [kind, u] of /** @type {[('color' | 'space' | 'size'), { count: number, file: string, line: number } | null][]} */ (Object.entries(untokened))) {
      if (!u) continue;
      out.push({ file: u.file, line: u.line, severity: 'info', confidence: 0.5, message: `${u.count} literal ${label[kind]} value(s) and the project defines no ${label[kind]} tokens (first here).`, remediation: `Define a ${label[kind]} scale in .craft/tokens.json (craft init --from-repo drafts one) before tokenizing; until then this is informational.` });
    }
    return out;
  }
};
