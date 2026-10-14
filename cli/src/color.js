// Color parsing and WCAG 2.x contrast math. Supports #rgb, #rgba, #rrggbb, #rrggbbaa,
// rgb()/rgba(), hsl()/hsla(), oklch(), and the CSS keywords black, white, transparent.

/** @typedef {{ r: number, g: number, b: number, a: number }} RGBA  r,g,b in 0..255, a in 0..1 */

/**
 * @param {string} s
 * @param {number} scale value that 100% maps to
 */
function num(s, scale) {
  const t = s.trim();
  if (t.endsWith('%')) return (parseFloat(t) / 100) * scale;
  return parseFloat(t);
}

/** @param {string} s */
function alpha(s) {
  if (s === undefined) return 1;
  const t = s.trim();
  return t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t);
}

/** @param {number} v */
const clamp255 = (v) => Math.min(255, Math.max(0, v));

/**
 * Parse a CSS color string. Returns null if the format is not supported.
 * @param {string} input
 * @returns {RGBA | null}
 */
export function parseColor(input) {
  const s = String(input).trim().toLowerCase();
  if (s === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (s === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }

  m = /^(rgba?|hsla?|oklch)\((.*)\)$/.exec(s);
  if (!m) return null;
  const fn = m[1];
  // Accept both "a, b, c, d" and "a b c / d".
  const [main, slashAlpha] = m[2].split('/');
  const parts = main.split(/[\s,]+/).filter(Boolean);
  const a = alpha(slashAlpha ?? parts[3]);
  if (parts.length < 3 || Number.isNaN(a)) return null;

  if (fn.startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map((p) => clamp255(num(p, 255)));
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a };
  }
  if (fn.startsWith('hsl')) {
    const h = ((parseFloat(parts[0]) % 360) + 360) % 360;
    const sat = num(parts[1], 1);
    const l = num(parts[2], 1);
    if ([h, sat, l].some(Number.isNaN)) return null;
    const k = (/** @type {number} */ n) => (n + h / 30) % 12;
    const f = (/** @type {number} */ n) => l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return { r: clamp255(f(0) * 255), g: clamp255(f(8) * 255), b: clamp255(f(4) * 255), a };
  }
  // oklch(L C H): L in 0..1 or %, C absolute, H degrees.
  const L = num(parts[0], 1);
  const C = parseFloat(parts[1]);
  const H = (parseFloat(parts[2]) * Math.PI) / 180;
  if ([L, C, H].some(Number.isNaN)) return null;
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);
  const l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_
  ];
  const enc = lin.map((c) => {
    const v = Math.min(1, Math.max(0, c));
    return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  });
  return { r: enc[0], g: enc[1], b: enc[2], a };
}

/**
 * WCAG relative luminance.
 * @param {RGBA} c
 */
export function luminance(c) {
  const ch = [c.r, c.g, c.b].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/**
 * Composite a translucent foreground over an opaque background.
 * @param {RGBA} fg
 * @param {RGBA} bg
 * @returns {RGBA}
 */
export function composite(fg, bg) {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

/**
 * WCAG contrast ratio, rounded down to 2 decimals so results never overstate compliance.
 * @param {RGBA} fg
 * @param {RGBA} bg must be opaque
 */
export function contrastRatio(fg, bg) {
  const f = fg.a < 1 ? composite(fg, bg) : fg;
  const l1 = luminance(f);
  const l2 = luminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.floor(ratio * 100) / 100;
}

/** WCAG 2.x AA thresholds by use. */
export const AA_THRESHOLDS = { text: 4.5, 'large-text': 3, ui: 3 };
