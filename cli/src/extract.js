// craft init --from-repo: draft .craft/tokens.json from what the project already declares.
// Static only: CSS custom properties (:root, @theme, dark-mode scopes) and object literals in
// tailwind.config.*, read from the AST. Nothing from the project is executed.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseJs } from '@babel/parser';
import { listFiles } from './files.js';
import { parseDocument } from './document.js';
import { parseColor } from './color.js';

/** @typedef {{ name: string, value: string, theme: 'light' | 'dark', file: string, line: number }} CustomProp */

const ROOT_SCOPE = /^(:root|html|:host|@theme(\s+\w+)?)$/;
const DARK_SCOPE = /^(:root|html)?\s*(\.dark|\[data-theme=["']?dark["']?\]|\[data-mode=["']?dark["']?\]|\.theme-dark)$|^\.dark\s+:root$|^:root\.dark$|^html\.dark$/;

/** Semantic color roles recognized from common naming conventions (shadcn, Radix, Open Props, hand-rolled). */
const ROLES = /** @type {[RegExp, string][]} */ ([
  [/^(color-)?(muted-foreground|text-muted|fg-muted|text-secondary|foreground-muted)$/, 'text-muted'],
  [/^(color-)?(primary-foreground|on-primary|accent-foreground|on-accent)$/, 'on-accent'],
  [/^(color-)?(background|bg|surface|page|canvas|base-100)$/, 'surface'],
  [/^(color-)?(card|surface-raised|bg-raised|popover|panel)$/, 'surface-raised'],
  [/^(color-)?(muted|surface-sunken|bg-muted|bg-subtle)$/, 'surface-sunken'],
  [/^(color-)?(foreground|text|fg|ink|base-content|body)$/, 'text'],
  [/^(color-)?(primary|accent|brand)$/, 'accent'],
  [/^(color-)?(border|line|divider|input)$/, 'border'],
  [/^(color-)?(ring|focus|focus-ring)$/, 'focus'],
  [/^(color-)?(destructive|danger|error)$/, 'danger'],
  [/^(color-)?(success|positive)$/, 'success'],
  [/^(color-)?(warning|caution)$/, 'warning']
]);

/**
 * @param {string} s
 * @returns {string}
 */
const tokenName = (s) => s.replace(/^--/, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^[^a-zA-Z0-9]+/, '').replace(/-+$/, '') || 'x';

/**
 * Normalize a color value; supports bare HSL/OKLCH channels ("222 47% 11%").
 * @param {string} v
 * @returns {string | null}
 */
export function asColor(v) {
  const value = v.trim();
  if (parseColor(value)) return value;
  if (/^\d+(\.\d+)?(deg)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(value)) return parseColor(`hsl(${value})`) ? `hsl(${value})` : null;
  return null;
}

/**
 * @param {string} name custom property without the leading --
 * @param {string} value
 * @returns {'color' | 'space' | 'radius' | 'fontSize' | 'fontFamily' | 'shadow' | 'duration' | null}
 */
export function classify(name, value) {
  const v = value.trim();
  if (asColor(v)) return 'color';
  if (/^(radius|rounded)/.test(name)) return 'radius';
  if (/^(font-size|text-(?!muted|foreground|color)|fs-)/.test(name) && /^[\d.]+(px|rem|em)$|^clamp\(/.test(v)) return 'fontSize';
  if (/^(font|font-family|ff)(-|$)/.test(name) && /[a-z]/i.test(v) && !/^[\d.]+(px|rem)$/.test(v)) return 'fontFamily';
  if (/^(shadow|elevation)/.test(name)) return 'shadow';
  if (/^(duration|transition-duration|speed)/.test(name) || /^[\d.]+m?s$/.test(v)) return 'duration';
  if (/^(space|spacing|gap|size|gutter|pad)/.test(name) && /^-?[\d.]+(px|rem|em)$/.test(v)) return 'space';
  return null;
}

/**
 * Custom properties declared at root or theme scope across the project.
 * @param {string} root
 * @param {string[]} [ignore]
 * @returns {CustomProp[]}
 */
export function collectCustomProps(root, ignore = []) {
  /** @type {CustomProp[]} */
  const out = [];
  for (const file of listFiles(root, { ignore, maxFileBytes: 1_000_000 })) {
    const doc = parseDocument(file, readFileSync(join(root, file), 'utf8'));
    for (const css of doc.css) {
      for (const r of css.rules) {
        const sel = r.selector.trim();
        const darkMedia = r.media.some((m) => /prefers-color-scheme:\s*dark/.test(m));
        const isDark = DARK_SCOPE.test(sel) || (darkMedia && ROOT_SCOPE.test(sel));
        if (!isDark && (!ROOT_SCOPE.test(sel) || r.media.length)) continue;
        for (const d of r.decls) {
          if (d.prop.startsWith('--')) out.push({ name: d.prop.slice(2), value: d.value.trim(), theme: isDark ? 'dark' : 'light', file, line: d.line });
        }
      }
    }
  }
  return out;
}

/**
 * Colors from tailwind.config.{js,cjs,mjs,ts}: theme.colors and theme.extend.colors object literals.
 * @param {string} root
 * @returns {{ name: string, value: string, file: string }[]}
 */
export function tailwindColors(root) {
  /** @type {{ name: string, value: string, file: string }[]} */
  const out = [];
  for (const file of ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts']) {
    if (!existsSync(join(root, file))) continue;
    /** @type {any} */
    let ast;
    try {
      ast = parseJs(readFileSync(join(root, file), 'utf8'), { sourceType: 'unambiguous', plugins: file.endsWith('.ts') ? ['typescript'] : [], errorRecovery: true });
    } catch {
      continue;
    }
    /**
     * @param {any} obj ObjectExpression
     * @param {string} prefix
     */
    const flatten = (obj, prefix) => {
      for (const p of obj.properties ?? []) {
        if (p.type !== 'ObjectProperty') continue;
        const key = p.key.type === 'Identifier' ? p.key.name : p.key.type === 'StringLiteral' || p.key.type === 'NumericLiteral' ? String(p.key.value) : null;
        if (key === null) continue;
        const name = key === 'DEFAULT' ? prefix : prefix ? `${prefix}-${key}` : key;
        if (p.value.type === 'StringLiteral' && asColor(p.value.value)) out.push({ name, value: asColor(p.value.value) ?? p.value.value, file });
        else if (p.value.type === 'ObjectExpression') flatten(p.value, name);
      }
    };
    /** @param {any} node */
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (node.type === 'ObjectProperty' && ((node.key.name ?? node.key.value) === 'colors') && node.value.type === 'ObjectExpression') flatten(node.value, '');
      for (const k of Object.keys(node)) if (k !== 'loc' && k !== 'start' && k !== 'end') visit(node[k]);
    };
    visit(ast.program);
  }
  return out;
}

/**
 * Build a tokens.json draft from the project. Returns null if nothing usable was found.
 * @param {string} root
 * @param {string[]} [ignore]
 * @param {{ mui?: import('./scan.js').MuiTheme[] }} [extra] theme objects read by craft scan
 * @returns {{ tokens: any | null, summary: string[] }}
 */
export function extractTokens(root, ignore = [], extra = {}) {
  const props = collectCustomProps(root, ignore);
  const tw = tailwindColors(root);
  /** @type {Record<string, Record<string, string>>} */
  const primitive = {};
  /** @type {Record<string, Record<string, Record<string, string>>>} */
  const semanticColor = {};
  /** @type {Map<string, { light?: string, dark?: string }>} */
  const byName = new Map();
  for (const p of props) {
    const e = byName.get(p.name) ?? {};
    e[p.theme] ??= p.value;
    byName.set(p.name, e);
  }
  /**
   * Resolve var(--x) chains to a literal for the theme.
   * @param {string} value
   * @param {'light' | 'dark'} theme
   * @param {number} [depth]
   * @returns {string}
   */
  const deref = (value, theme, depth = 0) => {
    const m = /^var\(\s*--([\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value.trim());
    if (!m || depth > 8) return value;
    const e = byName.get(m[1]);
    const next = e?.[theme] ?? e?.light ?? m[2];
    return next ? deref(next, theme, depth + 1) : value;
  };

  /** @type {string[]} */
  const unclassified = [];
  const set = (/** @type {string} */ group, /** @type {string} */ name, /** @type {string} */ value) => {
    primitive[group] ??= {};
    primitive[group][name] = value;
  };
  for (const [name, e] of [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const light = e.light !== undefined ? deref(e.light, 'light') : undefined;
    const dark = e.dark !== undefined ? deref(e.dark, 'dark') : undefined;
    const sample = light ?? dark ?? '';
    const kind = classify(name, sample);
    if (!kind) {
      unclassified.push(`--${name}`);
      continue;
    }
    const tn = tokenName(name.replace(/^color-/, ''));
    if (kind === 'color') {
      const role = ROLES.find(([re]) => re.test(name))?.[1];
      const lc = light !== undefined ? asColor(light) : null;
      const dc = dark !== undefined ? asColor(dark) : null;
      if (lc) set('color', tn, lc);
      if (dc) set('color', `${tn}-dark`, dc);
      if (role && (lc || dc)) {
        semanticColor.color ??= {};
        /** @type {Record<string, string>} */
        const themed = {};
        if (lc) themed.light = `{primitive.color.${tn}}`;
        if (dc) themed.dark = `{primitive.color.${tn}-dark}`;
        // First match wins per theme; a later alias (--color-x: var(--x)) only fills gaps.
        semanticColor.color[role] = { ...themed, ...(semanticColor.color[role] ?? {}) };
      }
    } else {
      set(kind, tn, sample);
    }
  }
  for (const c of tw) {
    const tn = tokenName(c.name);
    if (!primitive.color?.[tn]) set('color', tn, c.value);
  }
  // MUI palettes: roles the CSS variables did not already provide.
  const mui = extra.mui ?? [];
  for (const t of mui) {
    for (const theme of /** @type {const} */ (['light', 'dark'])) {
      for (const [role, value] of Object.entries(t[theme])) {
        const tn = `mui-${role}${theme === 'dark' ? '-dark' : ''}`;
        if (primitive.color?.[tn]) continue;
        set('color', tn, value);
        semanticColor.color ??= {};
        const entry = semanticColor.color[role] ?? {};
        entry[theme] ??= `{primitive.color.${tn}}`;
        semanticColor.color[role] = entry;
      }
    }
    if (t.radius && !primitive.radius?.['mui-radius']) set('radius', 'mui-radius', t.radius);
    if (t.fontFamily && !primitive.fontFamily?.['mui-body']) set('fontFamily', 'mui-body', t.fontFamily);
  }

  const hasDark = Object.values(semanticColor.color ?? {}).some((t) => t.dark);
  const themes = hasDark ? ['light', 'dark'] : ['light'];
  // Fill the missing theme of a semantic role with the other theme's value so every role resolves.
  for (const t of Object.values(semanticColor.color ?? {})) {
    if (hasDark && !t.dark) t.dark = /** @type {string} */ (t.light);
    if (!t.light) t.light = /** @type {string} */ (t.dark);
  }
  const roles = new Set(Object.keys(semanticColor.color ?? {}));
  /** @type {{ fg: string, bg: string, use: 'text' | 'large-text' | 'ui', note?: string }[]} */
  const pairs = [];
  const pair = (/** @type {string} */ fg, /** @type {string} */ bg, /** @type {'text' | 'ui'} */ use, /** @type {string} */ note) => {
    if (roles.has(fg) && roles.has(bg)) pairs.push({ fg: `color.${fg}`, bg: `color.${bg}`, use, note });
  };
  pair('text', 'surface', 'text', 'body text');
  pair('text', 'surface-raised', 'text', 'text on cards and popovers');
  pair('text-muted', 'surface', 'text', 'secondary text');
  pair('accent', 'surface', 'text', 'links and accent text');
  pair('on-accent', 'accent', 'text', 'primary button label');
  pair('focus', 'surface', 'ui', 'focus ring');
  pair('danger', 'surface', 'text', 'error text');

  const count = Object.values(primitive).reduce((n, g) => n + Object.keys(g).length, 0);
  const summary = [
    `${props.length} custom properties at root/theme scope in ${new Set(props.map((p) => p.file)).size} file(s); ${tw.length} Tailwind config color(s); ${mui.length} MUI theme(s).`,
    `${count} primitive token(s) in ${Object.keys(primitive).length} group(s): ${Object.entries(primitive).map(([g, v]) => `${g} ${Object.keys(v).length}`).join(', ') || 'none'}.`,
    `Semantic color roles recognized: ${[...roles].sort().join(', ') || 'none'}. Contrast pairs generated: ${pairs.length}.`,
    unclassified.length ? `Not classified (review by hand): ${unclassified.slice(0, 30).join(', ')}${unclassified.length > 30 ? `, and ${unclassified.length - 30} more` : ''}.` : 'Every custom property was classified.'
  ];
  if (!count) return { tokens: null, summary };
  return {
    tokens: {
      schemaVersion: '1.0',
      name: 'project-tokens',
      description: 'Drafted by craft init --from-repo from the project\'s existing custom properties, Tailwind config, and MUI theme. Role names are guesses from naming conventions: review every semantic mapping and pair before relying on it.',
      themes,
      primitive,
      semantic: semanticColor,
      pairs,
      meta: { source: 'extracted', generatedBy: 'craft init --from-repo' }
    },
    summary
  };
}
