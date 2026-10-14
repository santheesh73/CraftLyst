// Markup parsing into one element model for HTML (parse5), JSX/TSX (@babel/parser),
// and Vue/Svelte/Astro single-file components (parse5 over the template, postcss over styles).
import { parse as parseHtmlDoc, parseFragment } from 'parse5';
import { parse as parseJs } from '@babel/parser';
import { parseCss } from './css.js';

/**
 * @typedef {{ value: string | null, dynamic: boolean, line: number }} Attr
 * @typedef {{ prop: string, value: string, line: number }} StyleDecl
 * @typedef {{
 *   tag: string, attrs: Record<string, Attr>, classes: string[], classDynamic: boolean,
 *   styleDecls: StyleDecl[], line: number, endLine: number, column: number,
 *   children: Element[], parent: Element | null, text: { value: string, line: number }[],
 *   hasSpread: boolean, inLoop: boolean
 * }} Element
 * @typedef {{ value: string, line: number, context: string }} StringLit
 * @typedef {import('./css.js').Comment} Comment
 * @typedef {import('./css.js').CssModel} CssModel
 * @typedef {{ elements: Element[], all: Element[], strings: StringLit[], comments: Comment[], css: CssModel[], imports: string[], scripts: string[], error: string | null, isDocument: boolean }} MarkupModel
 */

/** @returns {MarkupModel} */
const empty = () => ({ elements: [], all: [], strings: [], comments: [], css: [], imports: [], scripts: [], error: null, isDocument: false });

/** @param {string} s */
const kebab = (s) => (s.startsWith('--') ? s : s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).replace(/^ms-/, '-ms-'));

/** CSS properties whose unitless numbers React treats as px. */
const UNITLESS = new Set(['opacity', 'z-index', 'font-weight', 'line-height', 'flex', 'flex-grow', 'flex-shrink', 'order', 'zoom', 'scale']);

/**
 * @param {string} tag
 * @param {number} line
 * @param {number} endLine
 * @param {number} column
 * @param {Element | null} parent
 * @returns {Element}
 */
function makeElement(tag, line, endLine, column, parent) {
  return { tag, attrs: {}, classes: [], classDynamic: false, styleDecls: [], line, endLine, column, children: [], parent, text: [], hasSpread: false, inLoop: false };
}

/**
 * @param {string} styleText
 * @param {number} line
 * @returns {StyleDecl[]}
 */
function parseStyleAttr(styleText, line) {
  const m = parseCss(`x{${styleText}}`);
  return m.decls.map((d) => ({ prop: d.prop, value: d.value, line }));
}

// ---------------------------------------------------------------- HTML / SFC

/**
 * @param {string} text
 * @param {{ fragment?: boolean }} [opts]
 * @returns {MarkupModel}
 */
export function parseHtml(text, opts = {}) {
  const model = empty();
  /** @type {any} */
  let doc;
  try {
    doc = opts.fragment ? parseFragment(text, { sourceCodeLocationInfo: true }) : parseHtmlDoc(text, { sourceCodeLocationInfo: true });
  } catch (err) {
    model.error = /** @type {Error} */ (err).message;
    return model;
  }
  model.isDocument = !opts.fragment && /<html[\s>]/i.test(text);
  /**
   * @param {any} node
   * @param {Element | null} parent
   */
  const visit = (node, parent) => {
    const loc = node.sourceCodeLocation;
    if (node.nodeName === '#comment') {
      if (loc) model.comments.push({ text: node.data.trim(), line: loc.startLine, endLine: loc.endLine });
      return;
    }
    if (node.nodeName === '#text') {
      const v = node.value.trim();
      if (v && parent && loc) {
        parent.text.push({ value: v, line: loc.startLine });
        model.strings.push({ value: v, line: loc.startLine, context: 'text' });
      }
      return;
    }
    if (node.tagName) {
      if (!loc) {
        // Implied elements (html/head/body inserted by the parser) carry no location.
        for (const c of node.childNodes ?? []) visit(c, parent);
        if (node.content) for (const c of node.content.childNodes ?? []) visit(c, parent);
        return;
      }
      const el = makeElement(node.tagName.toLowerCase(), loc.startLine, loc.endLine ?? loc.startLine, loc.startCol, parent);
      for (const a of node.attrs ?? []) {
        const name = a.name;
        const aloc = loc.attrs?.[name];
        const dynamic = /^[:@]|^v-|^on:|^bind:|^class:/.test(name) || /^\{.*\}$/s.test(a.value);
        el.attrs[normalizeAttr(name)] = { value: a.value, dynamic, line: aloc?.startLine ?? loc.startLine };
        if (name === 'class' && !dynamic) el.classes.push(...a.value.split(/\s+/).filter(Boolean));
        if (name === 'class' && /\{/.test(a.value)) el.classDynamic = true;
        if (name === ':class' || name === 'v-bind:class' || name.startsWith('class:')) el.classDynamic = true;
        if (name === 'style' && !dynamic) el.styleDecls.push(...parseStyleAttr(a.value, aloc?.startLine ?? loc.startLine));
        if (name.startsWith('{...') || name === 'v-bind') el.hasSpread = true;
      }
      if (el.attrs['v-for'] || el.attrs['#each']) el.inLoop = true;
      if (parent?.inLoop) el.inLoop = true;
      (parent ? parent.children : model.elements).push(el);
      model.all.push(el);
      if (el.tag === 'style') {
        const inner = (node.childNodes ?? []).map((/** @type {any} */ c) => c.value ?? '').join('');
        const startLine = node.childNodes?.[0]?.sourceCodeLocation?.startLine ?? loc.startLine;
        model.css.push(parseCss(inner, { lineOffset: startLine - 1, scss: /lang=["'](scss|sass)/.test(text.slice(loc.startOffset, loc.startOffset + 80)) }));
        return;
      }
      if (el.tag === 'script') {
        const inner = (node.childNodes ?? []).map((/** @type {any} */ c) => c.value ?? '').join('');
        model.scripts.push(inner);
        if (el.attrs.src?.value) model.imports.push(el.attrs.src.value);
        for (const m of inner.matchAll(/import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g)) model.imports.push(m[1]);
        return;
      }
      for (const c of node.childNodes ?? []) visit(c, el);
      if (node.content) for (const c of node.content.childNodes ?? []) visit(c, el);
      return;
    }
    for (const c of node.childNodes ?? []) visit(c, parent);
  };
  visit(doc, null);
  return model;
}

/**
 * Map framework event and binding attribute spellings to their DOM/JSX equivalents.
 * @param {string} name
 */
function normalizeAttr(name) {
  const n = name.toLowerCase();
  if (n === '@click' || n === 'v-on:click' || n === 'on:click' || n === 'onclick') return 'onClick';
  if (n === '@keydown' || n === 'on:keydown' || n === 'onkeydown' || n === '@keyup' || n === 'on:keyup' || n === 'onkeyup') return 'onKeyDown';
  if (n === 'tabindex') return 'tabIndex';
  if (n.startsWith(':') && !n.startsWith('::')) return n.slice(1);
  if (n.startsWith('v-bind:')) return n.slice(7);
  return n;
}

/**
 * Vue, Svelte, and Astro components: template markup plus <style> and <script> blocks.
 * @param {string} text
 * @returns {MarkupModel}
 */
export function parseSfc(text) {
  // Blank Astro frontmatter so line numbers stay correct.
  let src = text;
  const fm = /^---\r?\n[\s\S]*?\r?\n---/.exec(src);
  /** @type {string[]} */
  const extraScripts = [];
  if (fm) {
    extraScripts.push(fm[0]);
    src = fm[0].replace(/[^\n]/g, ' ') + src.slice(fm[0].length);
  }
  const model = parseHtml(src, { fragment: true });
  model.scripts.push(...extraScripts);
  for (const s of extraScripts) for (const m of s.matchAll(/import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g)) model.imports.push(m[1]);
  return model;
}

// ---------------------------------------------------------------- JSX / TSX

/**
 * @param {any} name
 * @returns {string}
 */
function jsxName(name) {
  if (!name) return '';
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return `${jsxName(name.object)}.${jsxName(name.property)}`;
  if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
  return '';
}

/**
 * Collect static string pieces from a className expression (cn("a", cond && "b"), template literals).
 * @param {any} node
 * @param {string[]} out
 * @returns {boolean} true if any part is dynamic
 */
function staticStrings(node, out) {
  if (!node) return false;
  switch (node.type) {
    case 'StringLiteral':
      out.push(node.value);
      return false;
    case 'TemplateLiteral':
      for (const q of node.quasis) out.push(q.value.cooked ?? q.value.raw);
      node.expressions.forEach((/** @type {any} */ e) => staticStrings(e, out));
      return node.expressions.length > 0;
    case 'CallExpression':
      node.arguments.forEach((/** @type {any} */ a) => staticStrings(a, out));
      return true;
    case 'LogicalExpression':
    case 'BinaryExpression':
      staticStrings(node.left, out);
      staticStrings(node.right, out);
      return true;
    case 'ConditionalExpression':
      staticStrings(node.consequent, out);
      staticStrings(node.alternate, out);
      return true;
    case 'ArrayExpression':
      node.elements.forEach((/** @type {any} */ e) => staticStrings(e, out));
      return true;
    case 'ObjectExpression':
      for (const p of node.properties) {
        if (p.key?.type === 'StringLiteral') out.push(p.key.value);
        else if (p.key?.type === 'Identifier') out.push(p.key.name);
      }
      return true;
    default:
      return true;
  }
}

/**
 * @param {string} text
 * @param {{ typescript?: boolean }} [opts]
 * @returns {MarkupModel}
 */
export function parseJsx(text, opts = {}) {
  const model = empty();
  /** @type {any} */
  let ast;
  try {
    ast = parseJs(text, {
      sourceType: 'unambiguous',
      errorRecovery: true,
      plugins: ['jsx', ...(opts.typescript ? /** @type {const} */ (['typescript']) : []), 'decorators-legacy', 'importAttributes'],
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true
    });
  } catch (err) {
    model.error = /** @type {Error} */ (err).message;
    return model;
  }
  model.scripts.push(text);
  for (const c of ast.comments ?? []) {
    model.comments.push({ text: c.value.trim(), line: c.loc.start.line, endLine: c.loc.end.line });
  }

  /**
   * @param {any} node
   * @param {Element | null} parent
   * @param {string} context
   * @param {boolean} inLoop
   */
  const visit = (node, parent, context, inLoop) => {
    if (!node || typeof node.type !== 'string') return;
    switch (node.type) {
      case 'ImportDeclaration':
        model.imports.push(node.source.value);
        return;
      case 'CallExpression':
        if (node.callee?.type === 'Identifier' && node.callee.name === 'require' && node.arguments[0]?.type === 'StringLiteral') model.imports.push(node.arguments[0].value);
        if (node.callee?.type === 'Import' && node.arguments[0]?.type === 'StringLiteral') model.imports.push(node.arguments[0].value);
        {
          const isLoop = node.callee?.type === 'MemberExpression' && ['map', 'flatMap', 'forEach'].includes(node.callee.property?.name);
          for (const key of Object.keys(node)) {
            if (key === 'loc' || key === 'start' || key === 'end') continue;
            walkChild(node[key], parent, context, inLoop || isLoop);
          }
        }
        return;
      case 'StringLiteral':
        model.strings.push({ value: node.value, line: node.loc.start.line, context });
        return;
      case 'TemplateLiteral':
        for (const q of node.quasis) {
          const v = q.value.cooked ?? q.value.raw;
          if (v.trim()) model.strings.push({ value: v, line: q.loc.start.line, context });
        }
        node.expressions.forEach((/** @type {any} */ e) => visit(e, parent, context, inLoop));
        return;
      case 'JSXText': {
        const v = node.value.replace(/\s+/g, ' ').trim();
        if (v && parent) {
          parent.text.push({ value: v, line: node.loc.start.line });
          model.strings.push({ value: v, line: node.loc.start.line, context: 'text' });
        }
        return;
      }
      case 'JSXFragment':
        node.children.forEach((/** @type {any} */ c) => visit(c, parent, context, inLoop));
        return;
      case 'JSXElement': {
        const open = node.openingElement;
        const el = makeElement(jsxName(open.name), node.loc.start.line, node.loc.end.line, node.loc.start.column + 1, parent);
        el.inLoop = inLoop;
        for (const a of open.attributes) {
          if (a.type === 'JSXSpreadAttribute') {
            el.hasSpread = true;
            continue;
          }
          const name = a.name.type === 'JSXNamespacedName' ? `${a.name.namespace.name}:${a.name.name.name}` : a.name.name;
          const line = a.loc.start.line;
          const v = a.value;
          if (v === null) {
            el.attrs[name] = { value: '', dynamic: false, line };
          } else if (v.type === 'StringLiteral') {
            el.attrs[name] = { value: v.value, dynamic: false, line };
          } else if (v.type === 'JSXExpressionContainer') {
            const ex = v.expression;
            if (ex.type === 'StringLiteral') el.attrs[name] = { value: ex.value, dynamic: false, line };
            else if (ex.type === 'TemplateLiteral' && ex.expressions.length === 0) el.attrs[name] = { value: ex.quasis.map((/** @type {any} */ q) => q.value.cooked).join(''), dynamic: false, line };
            else if (ex.type === 'NumericLiteral' || ex.type === 'BooleanLiteral') el.attrs[name] = { value: String(ex.value), dynamic: false, line };
            else el.attrs[name] = { value: null, dynamic: true, line };
            if (name === 'style' && ex.type === 'ObjectExpression') {
              for (const p of ex.properties) {
                if (p.type !== 'ObjectProperty') continue;
                const key = p.key.type === 'Identifier' ? p.key.name : p.key.type === 'StringLiteral' ? p.key.value : null;
                if (!key) continue;
                const prop = kebab(key);
                let value = null;
                if (p.value.type === 'StringLiteral') value = p.value.value;
                else if (p.value.type === 'NumericLiteral') value = UNITLESS.has(prop) || p.value.value === 0 ? String(p.value.value) : `${p.value.value}px`;
                else if (p.value.type === 'TemplateLiteral' && p.value.expressions.length === 0) value = p.value.quasis[0].value.cooked;
                if (value !== null) el.styleDecls.push({ prop, value, line: p.loc.start.line });
              }
            }
            if (name === 'className' || name === 'class') {
              /** @type {string[]} */
              const parts = [];
              el.classDynamic = staticStrings(ex, parts);
              el.classes.push(...parts.join(' ').split(/\s+/).filter(Boolean));
            }
            if (ex.type !== 'StringLiteral') visit(ex, el, `attr:${name}`, false);
          }
          if ((name === 'className' || name === 'class') && v && v.type === 'StringLiteral') {
            el.classes.push(...String(el.attrs[name].value).split(/\s+/).filter(Boolean));
          }
          if (v && v.type === 'StringLiteral' && name !== 'className' && name !== 'class') {
            model.strings.push({ value: v.value, line, context: `attr:${name}` });
          }
        }
        (parent ? parent.children : model.elements).push(el);
        model.all.push(el);
        node.children.forEach((/** @type {any} */ c) => visit(c, el, 'text', false));
        return;
      }
      case 'JSXExpressionContainer':
        visit(node.expression, parent, context === 'text' ? 'expr' : context, inLoop);
        return;
      default:
        for (const key of Object.keys(node)) {
          if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
          walkChild(node[key], parent, context === 'text' ? 'expr' : context, inLoop);
        }
    }
  };
  /**
   * @param {any} v
   * @param {Element | null} parent
   * @param {string} context
   * @param {boolean} inLoop
   */
  const walkChild = (v, parent, context, inLoop) => {
    if (Array.isArray(v)) v.forEach((x) => visit(x, parent, context, inLoop));
    else if (v && typeof v === 'object' && typeof v.type === 'string') visit(v, parent, context, inLoop);
  };
  visit(ast.program, null, 'js', false);
  model.isDocument = model.all.some((e) => e.tag === 'html');
  return model;
}
