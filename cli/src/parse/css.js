// CSS parsing with postcss into a flat, rule-friendly model with source lines.
import postcss from 'postcss';

/**
 * @typedef {{ prop: string, value: string, important: boolean, line: number, column: number, rule: CssRule | null }} CssDecl
 * @typedef {{ selector: string, line: number, endLine: number, decls: CssDecl[], media: string[] }} CssRule
 * @typedef {{ name: string, params: string, line: number, endLine: number }} CssAtRule
 * @typedef {{ text: string, line: number, endLine: number }} Comment
 * @typedef {{ rules: CssRule[], decls: CssDecl[], atRules: CssAtRule[], keyframes: Record<string, string[]>, comments: Comment[], error: string | null }} CssModel
 */

/**
 * Blank out `//` line comments (SCSS) while preserving offsets and line numbers.
 * @param {string} text
 */
function stripLineComments(text) {
  let out = '';
  let i = 0;
  /** @type {string | null} */
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += text[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
    } else if (c === '"' || c === "'") {
      quote = c;
      out += c;
      i++;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      out += text.slice(i, stop);
      i = stop;
    } else if (c === '/' && text[i + 1] === '/' && text[i - 1] !== ':') {
      while (i < text.length && text[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/**
 * @param {string} text
 * @param {{ lineOffset?: number, scss?: boolean }} [opts]
 * @returns {CssModel}
 */
export function parseCss(text, opts = {}) {
  const offset = opts.lineOffset ?? 0;
  /** @type {CssModel} */
  const model = { rules: [], decls: [], atRules: [], keyframes: /** @type {Record<string, string[]>} */ ({}), comments: [], error: null };
  let root;
  try {
    root = postcss.parse(opts.scss ? stripLineComments(text) : text);
  } catch (err) {
    const e = /** @type {any} */ (err);
    model.error = `${e.reason ?? e.message}${e.line ? ` at line ${e.line + offset}` : ''}`;
    return model;
  }
  /**
   * @param {any} node
   * @param {string[]} media
   * @param {CssRule | null} rule
   */
  const visit = (node, media, rule) => {
    const line = (node.source?.start?.line ?? 1) + offset;
    const endLine = (node.source?.end?.line ?? node.source?.start?.line ?? 1) + offset;
    if (node.type === 'comment') {
      model.comments.push({ text: node.text, line, endLine });
      return;
    }
    if (node.type === 'decl') {
      /** @type {CssDecl} */
      const d = { prop: node.prop.startsWith('--') ? node.prop : node.prop.toLowerCase(), value: node.value, important: Boolean(node.important), line, column: node.source?.start?.column ?? 1, rule };
      model.decls.push(d);
      if (rule) rule.decls.push(d);
      return;
    }
    if (node.type === 'atrule') {
      model.atRules.push({ name: node.name.toLowerCase(), params: node.params, line, endLine });
      if (/^(-\w+-)?keyframes$/i.test(node.name)) {
        /** @type {Set<string>} */
        const props = new Set();
        node.walkDecls((/** @type {any} */ d) => { props.add(d.prop.toLowerCase()); });
        model.keyframes[node.params.trim()] = [...props];
      }
      const nextMedia = ['media', 'supports', 'container', 'layer'].includes(node.name.toLowerCase()) ? [...media, `@${node.name} ${node.params}`] : media;
      // Declarations directly inside at-rules like @theme or @font-face belong to a pseudo-rule.
      /** @type {CssRule} */
      const pseudo = { selector: `@${node.name.toLowerCase()}${node.params ? ' ' + node.params : ''}`, line, endLine, decls: [], media };
      let hasDecls = false;
      for (const child of node.nodes ?? []) {
        if (child.type === 'decl') hasDecls = true;
        visit(child, nextMedia, child.type === 'decl' ? pseudo : rule);
      }
      if (hasDecls) model.rules.push(pseudo);
      return;
    }
    if (node.type === 'rule') {
      const selector = rule && node.selector.includes('&') ? node.selector.replace(/&/g, rule.selector) : rule ? `${rule.selector} ${node.selector}` : node.selector;
      /** @type {CssRule} */
      const r = { selector, line, endLine, decls: [], media };
      model.rules.push(r);
      for (const child of node.nodes ?? []) visit(child, media, r);
      return;
    }
    for (const child of node.nodes ?? []) visit(child, media, rule);
  };
  visit(root, [], null);
  return model;
}
