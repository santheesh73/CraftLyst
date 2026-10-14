// Project file discovery. Respects .gitignore files (root and nested), craft.config.json
// ignore globs, and built-in ignores. Returns POSIX relative paths, sorted.
import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { globToRegExp } from './glob.js';

export const DEFAULT_IGNORES = [
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit',
  '.astro', '.output', '.vercel', '.turbo', '.cache', 'coverage', 'vendor', '.craft/reports', 'storybook-static',
  // Agent configuration and installed skills (including this one) are not the product's UI.
  '.claude', '.cursor', '.codex', '.agents', '.windsurf', '.github',
  // Scripts and styles in static asset folders are served verbatim, usually third-party or built.
  'public/**/*.js', 'public/**/*.css', 'static/**/*.js', 'static/**/*.css'
];

/** File extensions Slop Lint reads. */
export const SOURCE_EXTENSIONS = new Set(['.css', '.scss', '.pcss', '.html', '.htm', '.jsx', '.tsx', '.js', '.ts', '.mjs', '.vue', '.svelte', '.astro']);

/** @typedef {{ pattern: RegExp, negate: boolean, dirOnly: boolean, base: string }} IgnoreRule */

/**
 * @param {string} text
 * @param {string} base POSIX dir relative to root ('' for root)
 * @returns {IgnoreRule[]}
 */
export function parseGitignore(text, base) {
  /** @type {IgnoreRule[]} */
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/(?<!\\)\s+$/, '');
    if (!line || line.startsWith('#')) continue;
    const negate = line.startsWith('!');
    if (negate) line = line.slice(1);
    const dirOnly = line.endsWith('/');
    rules.push({ pattern: globToRegExp(line.replace(/\/$/, '')), negate, dirOnly, base });
  }
  return rules;
}

/**
 * @param {IgnoreRule[]} rules
 * @param {string} rel
 * @param {boolean} isDir
 */
function ignoredBy(rules, rel, isDir) {
  let ignored = false;
  for (const r of rules) {
    if (r.dirOnly && !isDir) continue;
    if (r.base && !rel.startsWith(r.base + '/')) continue;
    const local = r.base ? rel.slice(r.base.length + 1) : rel;
    if (r.pattern.test(local)) ignored = !r.negate;
  }
  return ignored;
}

/**
 * List source files under root.
 * @param {string} root
 * @param {{ ignore?: string[], extensions?: Set<string>, maxFileBytes?: number }} [opts]
 * @returns {string[]}
 */
export function listFiles(root, opts = {}) {
  const extensions = opts.extensions ?? SOURCE_EXTENSIONS;
  const extra = (opts.ignore ?? []).map((g) => globToRegExp(g));
  const builtIn = DEFAULT_IGNORES.map((g) => globToRegExp(g));
  /** @type {string[]} */
  const out = [];
  /**
   * @param {string} rel
   * @param {IgnoreRule[]} inherited
   */
  const walk = (rel, inherited) => {
    const abs = rel ? join(root, rel) : root;
    let rules = inherited;
    // A nested folder with its own LICENSE and no package.json is a copied-in third-party library.
    if (rel && !existsSync(join(abs, 'package.json')) && readdirSync(abs).some((n) => /^(licen[cs]e|copying)(\.\w+)?$/i.test(n))) return;
    const gi = join(abs, '.gitignore');
    if (existsSync(gi)) rules = [...inherited, ...parseGitignore(readFileSync(gi, 'utf8'), rel)];
    for (const name of readdirSync(abs).sort()) {
      const childRel = rel ? `${rel}/${name}` : name;
      const st = lstatSync(join(abs, name));
      if (st.isSymbolicLink()) continue;
      const isDir = st.isDirectory();
      if (builtIn.some((r) => r.test(childRel)) || extra.some((r) => r.test(childRel)) || ignoredBy(rules, childRel, isDir)) continue;
      if (isDir) walk(childRel, rules);
      else {
        const dot = name.lastIndexOf('.');
        if (dot > 0 && extensions.has(name.slice(dot).toLowerCase()) && !/\.min\.(js|css)$/.test(name)) {
          if (!opts.maxFileBytes || st.size <= opts.maxFileBytes) out.push(childRel);
        }
      }
    }
  };
  walk('', []);
  return out;
}
