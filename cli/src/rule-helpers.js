// Shared detection helpers for Slop Lint rules.

/** @typedef {import('./document.js').Document} Document */
/** @typedef {import('./parse/markup.js').Element} Element */

export const COLOR_PROPS = new Set([
  'color', 'background', 'background-color', 'border', 'border-color', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline', 'outline-color', 'fill', 'stroke',
  'text-decoration-color', 'caret-color', 'accent-color', 'column-rule-color', 'box-shadow', 'text-shadow'
]);
export const SPACING_PROPS = new Set([
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-inline', 'margin-block', 'margin-inline-start', 'margin-inline-end', 'margin-block-start', 'margin-block-end',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline', 'padding-block', 'padding-inline-start', 'padding-inline-end', 'padding-block-start', 'padding-block-end',
  'gap', 'row-gap', 'column-gap', 'grid-gap'
]);
export const FONT_SIZE_PROPS = new Set(['font-size']);

const NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'silver', 'maroon', 'navy', 'teal', 'olive',
  'lime', 'aqua', 'fuchsia', 'cyan', 'magenta', 'gold', 'indigo', 'violet', 'brown', 'coral', 'salmon', 'tomato', 'crimson', 'beige',
  'ivory', 'khaki', 'lavender', 'linen', 'orchid', 'plum', 'tan', 'turquoise', 'wheat', 'whitesmoke', 'gainsboro', 'darkgray', 'lightgray',
  'dimgray', 'slategray', 'darkblue', 'lightblue', 'skyblue', 'royalblue', 'steelblue', 'darkred', 'darkgreen', 'lightgreen', 'hotpink', 'rebeccapurple'
]);

const COLOR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/i;
const HEX = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i;

/**
 * Strip var(...) references (including fallbacks) so literals inside fallbacks do not count.
 * @param {string} value
 */
export function withoutVars(value) {
  let v = value;
  let prev;
  do {
    prev = v;
    v = v.replace(/var\([^()]*(\([^()]*\)[^()]*)*\)/gi, 'VAR');
  } while (v !== prev);
  return v;
}

/**
 * Literal colors in a CSS value (ignoring var() and color keywords like currentColor/transparent).
 * @param {string} value
 * @returns {string[]}
 */
export function colorLiterals(value) {
  const v = withoutVars(value);
  /** @type {string[]} */
  const out = [];
  for (const m of v.matchAll(new RegExp(HEX.source, 'gi'))) out.push(m[0]);
  for (const m of v.matchAll(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\([^)]*\)/gi)) out.push(m[0]);
  for (const word of v.toLowerCase().split(/[\s,/()]+/)) if (NAMED_COLORS.has(word)) out.push(word);
  return out;
}

/** @param {string} value */
export const hasColorLiteral = (value) => colorLiterals(value).length > 0;

/**
 * Literal lengths in a value that are not on the allowlist (0, 1px, 100%, auto, keywords).
 * @param {string} value
 * @returns {string[]}
 */
export function lengthLiterals(value) {
  const v = withoutVars(value).replace(/calc\(|min\(|max\(|clamp\(/gi, ' ');
  /** @type {string[]} */
  const out = [];
  for (const m of v.matchAll(/(-?\d*\.?\d+)(px|rem|em)\b/gi)) {
    const n = Number(m[1]);
    if (n === 0) continue;
    if (m[2].toLowerCase() === 'px' && Math.abs(n) === 1) continue;
    out.push(m[0]);
  }
  return out;
}

/**
 * Parse a Tailwind class with an arbitrary value, e.g. "md:hover:bg-[#fff]" -> { utility: "bg", value: "#fff" }.
 * @param {string} cls
 * @returns {{ utility: string, value: string, variants: string[] } | null}
 */
export function tailwindArbitrary(cls) {
  const m = /^((?:[a-z0-9@[\]&_:-]+:)*)!?-?([a-z][a-z0-9-]*?)-\[([^\]]+)\]$/i.exec(cls);
  if (!m) return null;
  return { utility: m[2], value: m[3].replace(/_/g, ' '), variants: m[1] ? m[1].split(':').filter(Boolean) : [] };
}

export const TW_COLOR_UTILS = new Set(['bg', 'text', 'border', 'border-t', 'border-r', 'border-b', 'border-l', 'border-x', 'border-y', 'fill', 'stroke', 'ring', 'outline', 'decoration', 'from', 'via', 'to', 'shadow', 'accent', 'caret', 'divide', 'placeholder']);
export const TW_SPACING_UTILS = new Set(['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me', 'gap', 'gap-x', 'gap-y', 'space-x', 'space-y']);

/**
 * Strip responsive/state variants: "md:hover:rounded-xl" -> "rounded-xl".
 * @param {string} cls
 */
export const baseClass = (cls) => cls.slice(cls.lastIndexOf(':') + 1).replace(/^!/, '');

/**
 * Index simple class selectors (".card", ".card:hover" ignored) to merged declarations.
 * @param {Document[]} docs
 * @returns {Map<string, Map<string, string>>}
 */
export function classIndex(docs) {
  /** @type {Map<string, Map<string, string>>} */
  const index = new Map();
  for (const d of docs) {
    for (const css of d.css) {
      for (const r of css.rules) {
        if (r.media.some((m) => /prefers|print/.test(m))) continue;
        for (const sel of r.selector.split(',')) {
          const m = /^\s*\.([A-Za-z_][\w-]*)\s*$/.exec(sel);
          if (!m) continue;
          const props = index.get(m[1]) ?? new Map();
          for (const decl of r.decls) props.set(decl.prop, decl.value);
          index.set(m[1], props);
        }
      }
    }
  }
  return index;
}

/**
 * Effective visual properties of an element from Tailwind classes, inline styles, and class CSS.
 * @param {Element} el
 * @param {Map<string, Map<string, string>>} classes
 * @returns {{ border: boolean, shadow: boolean, radius: number | null, padding: boolean, background: boolean, pill: boolean }}
 */
export function visualTraits(el, classes) {
  const t = { border: false, shadow: false, radius: /** @type {number | null} */ (null), padding: false, background: false, pill: false };
  /** @param {string} prop @param {string} value */
  const applyDecl = (prop, value) => {
    const v = value.trim().toLowerCase();
    if (/^border(-width)?$/.test(prop) && !/^(none|0)$/.test(v)) t.border = true;
    if (prop === 'box-shadow' && v !== 'none') t.shadow = true;
    if (prop === 'border-radius') {
      if (/9999|50%|999/.test(v)) {
        t.pill = true;
        t.radius = 9999;
      } else {
        const n = /(\d*\.?\d+)(px|rem)/.exec(v);
        if (n) t.radius = Number(n[1]) * (n[2] === 'rem' ? 16 : 1);
        else if (v.includes('var(')) t.radius = t.radius ?? -1;
      }
    }
    if (/^padding/.test(prop) && !/^0(px)?$/.test(v)) t.padding = true;
    if ((prop === 'background' || prop === 'background-color') && !/^(none|transparent)$/.test(v)) t.background = true;
  };
  for (const raw of el.classes) {
    const c = baseClass(raw);
    if (/^border(-[trblxy])?(-\d+)?$/.test(c) || c === 'border') t.border = true;
    if (/^ring(-\d+)?$/.test(c)) t.border = true;
    if (/^shadow(-(sm|md|lg|xl|2xl|inner|\[.+\]))?$/.test(c) && c !== 'shadow-none') t.shadow = true;
    const r = /^rounded(?:-[trblse]{1,2})?(?:-(none|sm|md|lg|xl|2xl|3xl|4xl|full|\[(.+)\]))?$/.exec(c);
    if (r) {
      const sizes = { none: 0, sm: 2, '': 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32, full: 9999 };
      const key = r[1] ?? '';
      if (key === 'full') t.pill = true;
      if (r[2]) {
        const n = /(\d*\.?\d+)(px|rem)?/.exec(r[2]);
        t.radius = n ? Number(n[1]) * (n[2] === 'rem' ? 16 : 1) : -1;
      } else t.radius = /** @type {Record<string, number>} */ (sizes)[key] ?? t.radius;
    }
    if (/^p[xytrblse]?-(?!0$)/.test(c)) t.padding = true;
    if (/^bg-(?!transparent$|none$|clip|gradient|linear|radial|conic|fixed|local|scroll|cover|contain|center|top|bottom|left|right|no-repeat|repeat|origin|blend|opacity)/.test(c)) t.background = true;
    const css = classes.get(raw) ?? classes.get(c);
    if (css) for (const [p, v] of css) applyDecl(p, v);
  }
  for (const d of el.styleDecls) applyDecl(d.prop, d.value);
  return t;
}

/** Files that render images (Open Graph cards via satori/next/og), not interface. */
/** Server-side template includes (Hugo, Go, Jinja, Liquid, Nunjucks, Handlebars, PHP): the page is assembled from other files. */
export const TEMPLATE_INCLUDE = /\{\{-?\s*(block|partial|template|include|yield)\b|\{%-?\s*(include|extends|block|render)\b|\{\{>\s*[\w/]|<\?php[^?]*\b(include|require)(_once)?\b/;

export const OG_IMAGE_FILE = /(^|\/)(opengraph-image|twitter-image|og-image|og)(\.[a-z]+)?\.(tsx|jsx|ts|js)$|(^|\/)api\/og(\/|\.)/;

/** Syntax-highlighting themes carry their own palette (Prism, highlight.js, Shiki). */
export const SYNTAX_THEME_FILE = /(^|\/)[\w.-]*(prism|highlight|hljs|shiki|syntax|code-theme)[\w.-]*\.(css|scss)$/i;

/**
 * Card-like: a boundary (border or shadow) plus radius, padding, and a background.
 * @param {ReturnType<typeof visualTraits>} t
 */
export const isCardLike = (t) => (t.border || t.shadow) && t.radius !== null && t.radius !== 0 && t.padding && t.background;

/**
 * Elements whose subtree is marked as illustrative content.
 * @param {Element} el
 */
export function isIllustrative(el) {
  for (let e = /** @type {Element | null} */ (el); e; e = e.parent) {
    if ('data-craft-illustrative' in e.attrs) return true;
  }
  return false;
}

/**
 * Is this an intrinsic (lowercase) element rather than a component?
 * @param {Element} el
 */
export const isIntrinsic = (el) => /^[a-z]/.test(el.tag) && !el.tag.includes('.');

/** Interactive intrinsic tags. */
export const INTERACTIVE = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary']);

/**
 * Accessible-name check for a control (static approximation).
 * @param {Element} el
 * @returns {boolean | null} true named, false unnamed, null unknown (spread/dynamic)
 */
export function hasAccessibleName(el) {
  if (el.hasSpread) return null;
  for (const a of ['aria-label', 'aria-labelledby', 'title', 'alt']) {
    if (a in el.attrs) return el.attrs[a].dynamic || Boolean(el.attrs[a].value?.trim()) ? true : false;
  }
  /** @param {Element} e @returns {boolean | null} */
  const textIn = (e) => {
    if (e.text.length) return true;
    // Content injected at runtime (v-html, innerHTML, set:html) cannot be read statically.
    let unknown = e.dynamicText || Object.keys(e.attrs).some((a) => /^(v-html|v-text|innerHTML|dangerouslySetInnerHTML|set:html|set:text|textContent)$/.test(a));
    for (const c of e.children) {
      if (c.tag === 'svg' || /Icon$|^Icon|^Lucide|^Fa[A-Z]|^Hi[A-Z]|^Md[A-Z]/.test(c.tag) || c.tag === 'i' || c.tag === 'img') {
        if (c.tag === 'img' && c.attrs.alt?.value) return true;
        if (c.attrs['aria-label']?.value || c.attrs.title?.value) return true;
        continue;
      }
      if (/sr-only|visually-hidden/.test(c.classes.join(' '))) return true;
      if (/^[A-Z]/.test(c.tag) || c.tag === 'slot') unknown = true;
      const inner = textIn(c);
      if (inner === true) return true;
      if (inner === null) unknown = true;
    }
    return unknown ? null : false;
  };
  return textIn(el);
}

/**
 * Text of the whole project source joined, for cheap project-wide signal searches.
 * @param {Document[]} docs
 */
export const projectText = (docs) => docs.map((d) => d.source).join('\n');

/**
 * 1-based line of a character offset.
 * @param {string} text
 * @param {number} offset
 */
export function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

export { COLOR_FN, HEX, NAMED_COLORS };
