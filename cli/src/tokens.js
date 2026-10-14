// Token resolution (primitive -> semantic -> component, per theme) and contrast checks
// over the declared foreground/background pairs.
import { parseColor, contrastRatio, AA_THRESHOLDS } from './color.js';

/** @typedef {import('./color.js').RGBA} RGBA */
/** @typedef {{ fg: string, bg: string, use: 'text' | 'large-text' | 'ui', note?: string }} Pair */
/** @typedef {{ schemaVersion: string, name: string, themes: string[], primitive: Record<string, Record<string, string | number>>, semantic: Record<string, Record<string, any>>, component?: Record<string, Record<string, any>>, pairs?: Pair[] }} Tokens */
/** @typedef {{ pair: Pair, theme: string, status: 'pass' | 'fail' | 'unresolved', ratio?: number, required: number, fg?: string, bg?: string, reason?: string }} PairResult */

const REF = /^\{([a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9-]+)+)\}$/;

/**
 * Look up a dotted path like "primitive.color.ink-900" for a theme, following references.
 * @param {Tokens} tokens
 * @param {string} path
 * @param {string} theme
 * @param {string[]} [seen]
 * @returns {string | number}
 */
export function resolve(tokens, path, theme, seen = []) {
  if (seen.includes(path)) throw new Error(`Token reference cycle: ${[...seen, path].join(' -> ')}`);
  const parts = path.split('.');
  /** @type {any} */
  let node = tokens;
  for (const p of parts) {
    node = node?.[p];
    if (node === undefined) throw new Error(`Unknown token "${path}"${seen.length ? ` (referenced from ${seen[seen.length - 1]})` : ''}.`);
  }
  if (node !== null && typeof node === 'object') {
    if (!(theme in node)) throw new Error(`Token "${path}" has no value for theme "${theme}". Add a "${theme}" key or use a single value.`);
    node = node[theme];
  }
  if (typeof node === 'string') {
    const m = REF.exec(node.trim());
    if (m) return resolve(tokens, m[1], theme, [...seen, path]);
  }
  return node;
}

/**
 * Check every declared pair in every theme against WCAG AA.
 * @param {Tokens} tokens
 * @returns {PairResult[]}
 */
export function checkPairs(tokens) {
  /** @type {PairResult[]} */
  const results = [];
  for (const theme of tokens.themes) {
    for (const pair of tokens.pairs ?? []) {
      const required = AA_THRESHOLDS[pair.use];
      try {
        const fgRaw = String(resolve(tokens, `semantic.${pair.fg}`, theme));
        const bgRaw = String(resolve(tokens, `semantic.${pair.bg}`, theme));
        const fg = parseColor(fgRaw);
        const bg = parseColor(bgRaw);
        if (!fg || !bg) {
          results.push({ pair, theme, status: 'unresolved', required, reason: `Unsupported color format: ${!fg ? fgRaw : bgRaw}` });
          continue;
        }
        if (bg.a < 1) {
          results.push({ pair, theme, status: 'unresolved', required, reason: `Background ${pair.bg} is translucent (${bgRaw}); contrast depends on what is behind it.` });
          continue;
        }
        const ratio = contrastRatio(fg, bg);
        results.push({ pair, theme, status: ratio >= required ? 'pass' : 'fail', ratio, required, fg: fgRaw, bg: bgRaw });
      } catch (err) {
        results.push({ pair, theme, status: 'unresolved', required, reason: /** @type {Error} */ (err).message });
      }
    }
  }
  return results;
}

/**
 * Every reference in the token file must resolve in every theme.
 * @param {Tokens} tokens
 * @returns {string[]} problems
 */
export function checkReferences(tokens) {
  /** @type {string[]} */
  const problems = [];
  for (const layer of /** @type {const} */ (['semantic', 'component'])) {
    for (const [group, entries] of Object.entries(tokens[layer] ?? {})) {
      for (const name of Object.keys(entries)) {
        for (const theme of tokens.themes) {
          try {
            resolve(tokens, `${layer}.${group}.${name}`, theme);
          } catch (err) {
            problems.push(/** @type {Error} */ (err).message);
          }
        }
      }
    }
  }
  return [...new Set(problems)];
}
