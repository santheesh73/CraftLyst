// Loads a source file into a Document: CSS models, elements, strings, comments, imports.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCss } from './parse/css.js';
import { parseHtml, parseJsx, parseSfc } from './parse/markup.js';

/**
 * @typedef {import('./parse/markup.js').Element} Element
 * @typedef {import('./parse/markup.js').StringLit} StringLit
 * @typedef {import('./parse/css.js').CssModel} CssModel
 * @typedef {import('./parse/css.js').Comment} Comment
 * @typedef {{
 *   file: string, ext: string, kind: 'css' | 'html' | 'jsx' | 'js' | 'sfc', source: string,
 *   css: CssModel[], elements: Element[], all: Element[], strings: StringLit[],
 *   comments: Comment[], imports: string[], scripts: string[], errors: string[], isDocument: boolean,
 *   isTest: boolean, isFixture: boolean
 * }} Document
 */

const TEST_FILE = /(^|\/)(__tests__|__mocks__|test|tests|spec|e2e|cypress|playwright)\/|\.(test|spec|stories|story)\.[a-z]+$/;
const FIXTURE_FILE = /(^|\/)(fixtures?|__fixtures__|mocks?|examples?|demo)\//;

/**
 * @param {string} root
 * @param {string} file POSIX relative path
 * @returns {Document}
 */
export function loadDocument(root, file) {
  const source = readFileSync(join(root, file), 'utf8');
  return parseDocument(file, source);
}

/**
 * @param {string} file
 * @param {string} source
 * @returns {Document}
 */
export function parseDocument(file, source) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  /** @type {Document} */
  const doc = {
    file, ext, kind: 'js', source, css: [], elements: [], all: [], strings: [], comments: [], imports: [], scripts: [], errors: [], isDocument: false,
    isTest: TEST_FILE.test(file), isFixture: FIXTURE_FILE.test(file)
  };
  if (ext === '.css' || ext === '.scss' || ext === '.pcss') {
    doc.kind = 'css';
    const m = parseCss(source, { scss: ext === '.scss' });
    doc.css.push(m);
    doc.comments.push(...m.comments);
    if (m.error) doc.errors.push(m.error);
    return doc;
  }
  /** @type {import('./parse/markup.js').MarkupModel} */
  let m;
  if (ext === '.html' || ext === '.htm') {
    doc.kind = 'html';
    m = parseHtml(source);
  } else if (ext === '.vue' || ext === '.svelte' || ext === '.astro') {
    doc.kind = 'sfc';
    m = parseSfc(source);
  } else {
    m = parseJsx(source, { typescript: ext === '.ts' || ext === '.tsx' });
    doc.kind = m.all.length ? 'jsx' : 'js';
  }
  doc.elements = m.elements;
  doc.all = m.all;
  doc.strings = m.strings;
  doc.comments = [...m.comments, ...m.css.flatMap((c) => c.comments)];
  doc.css = m.css;
  doc.imports = m.imports;
  doc.scripts = m.scripts;
  doc.isDocument = m.isDocument;
  if (m.error) doc.errors.push(m.error);
  for (const c of m.css) if (c.error) doc.errors.push(c.error);
  return doc;
}
