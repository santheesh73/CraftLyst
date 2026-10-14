// Conformance kit (contracts/conformance): the reference fixture passes every check and the
// broken fixture fails checks in every component. Browser tests skip, with the reason, when
// Chromium is not installed; CI installs it (ADR-0013).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cli } from '../../contracts/conformance/run.js';
import { validateAdapter, pageUrl, toMarkdown } from '../../contracts/conformance/lib/harness.js';
import { SUITES, COMPONENTS } from '../../contracts/conformance/lib/checks.js';
import { resolveFrom } from '../src/shoot.js';

const base = new URL('../../contracts/conformance/', import.meta.url);
const path = (/** @type {string} */ rel) => fileURLToPath(new URL(rel, base));

/** @param {string[]} args */
async function run(args) {
  let stdout = '';
  let stderr = '';
  const code = await cli(args, { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } });
  return { code, stdout, stderr, json: () => JSON.parse(stdout) };
}

/** @returns {Promise<string | false>} */
async function browserMissing() {
  if (!resolveFrom(process.cwd(), 'playwright')) return 'playwright is not installed';
  try {
    const { chromium } = await import('playwright');
    const b = await chromium.launch();
    await b.close();
    return false;
  } catch (err) {
    return `Chromium is not installed: ${String(/** @type {Error} */ (err).message).split('\n')[0]}`;
  }
}
const skip = await browserMissing();

test('12 component suites, each with a contract that names every check id', () => {
  assert.equal(COMPONENTS.length, 12);
  const specs = readdirSync(fileURLToPath(new URL('../components/', base)));
  for (const suite of SUITES) {
    assert.ok(specs.includes(`${suite.name}.md`), `contracts/components/${suite.name}.md missing`);
    const md = readFileSync(fileURLToPath(new URL(`../components/${suite.name}.md`, base)), 'utf8');
    for (const id of Object.keys(suite.checks)) assert.ok(md.includes(`\`${id}\``), `${suite.name}.md does not mention ${id}`);
  }
});

test('adapter validation and page resolution', () => {
  assert.deepEqual(validateAdapter({ name: 'x', page: { file: 'a.html' }, components: { button: {} } }), []);
  assert.match(validateAdapter({ name: 'x', page: {}, components: { widget: {} } }).join(' '), /page.*unknown component "widget"/);
  assert.match(String(/** @type {any} */ (pageUrl({ url: 'https://example.com/' }, '/', false)).error), /allow-network/);
  assert.equal(/** @type {any} */ (pageUrl({ url: 'http://127.0.0.1:3000/' }, '/', false)).url, 'http://127.0.0.1:3000/');
  assert.match(String(/** @type {any} */ (pageUrl({ file: 'nope.html' }, '/', false)).error), /not found/);
});

test('runner usage errors exit 2', async () => {
  assert.equal((await run([])).code, 2);
  assert.equal((await run(['--adapter', '/no/such/adapter.json'])).code, 2);
  assert.equal((await run(['--adapter', path('fixtures/reference/adapter.json'), '--components', 'widget'])).code, 2);
  assert.equal((await run(['--bogus'])).code, 2);
});

test('reference fixture passes every check', { skip }, async () => {
  const r = await run(['--adapter', path('fixtures/reference/adapter.json'), '--json']);
  const out = r.json();
  const failed = out.components.flatMap((/** @type {any} */ c) => c.checks.filter((/** @type {any} */ k) => k.status === 'fail').map((/** @type {any} */ k) => `${k.id}: ${k.evidence}`));
  assert.deepEqual(failed, []);
  assert.equal(r.code, 0);
  assert.equal(out.components.length, 12);
  assert.ok(out.summary.pass >= 80);
  assert.match(toMarkdown(out), /^# Conformance: reference-fixture/);
});

test('broken fixture fails checks in every component', { skip }, async () => {
  const r = await run(['--adapter', path('fixtures/broken/adapter.json'), '--json']);
  assert.equal(r.code, 1);
  for (const c of r.json().components) {
    assert.ok(c.checks.some((/** @type {any} */ k) => k.status === 'fail'), `${c.name} had no failing check`);
  }
  const byId = Object.fromEntries(r.json().components.flatMap((/** @type {any} */ c) => c.checks.map((/** @type {any} */ k) => [k.id, k.status])));
  for (const id of ['button/role', 'button/enter', 'text-field/name', 'text-field/invalid', 'dialog/role', 'dialog/focus-trap', 'menu/item-roles', 'tabs/roles', 'tooltip/focus', 'accordion/button', 'toast/announced', 'table/semantics', 'pagination/landmark', 'navigation/no-menu-roles']) {
    assert.equal(byId[id], 'fail', id);
  }
});
