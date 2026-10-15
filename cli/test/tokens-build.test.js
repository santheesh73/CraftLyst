// craft tokens build: golden files, determinism, validation, and the .craft/-only write rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main, EXIT } from '../src/cli.js';
import { buildTokens, HEADER } from '../src/tokens-build.js';

const FIXTURE = new URL('../fixtures/tokens-build/', import.meta.url);
const read = (/** @type {string} */ rel) => readFileSync(new URL(rel, FIXTURE), 'utf8');

/** @param {string[]} args */
async function run(args) {
  let stdout = '';
  let stderr = '';
  const code = await main(args, { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } });
  return { code, stdout, stderr, json: () => JSON.parse(stdout) };
}

/** A project dir with .craft/tokens.json set to the given object. @param {any} [tokens] */
function project(tokens) {
  const dir = mkdtempSync(join(tmpdir(), 'craft-tokens-'));
  mkdirSync(join(dir, '.craft'));
  if (tokens !== undefined) writeFileSync(join(dir, '.craft', 'tokens.json'), typeof tokens === 'string' ? tokens : JSON.stringify(tokens));
  return dir;
}

const MINIMAL = {
  schemaVersion: '1.0',
  name: 'three-themes',
  themes: ['light', 'dark', 'contrast'],
  primitive: { color: { ink: '#111111', paper: '#fefefe', yellow: '#ffff00' }, space: { 2: '8px' } },
  semantic: {
    color: { text: { light: '{primitive.color.ink}', dark: '{primitive.color.paper}', contrast: '{primitive.color.yellow}' }, line: '#888888' },
    space: { gap: '{primitive.space.2}' }
  },
  component: { card: { padding: '{semantic.space.gap}', border: { light: '{semantic.color.line}', dark: '{semantic.color.line}', contrast: '{primitive.color.yellow}' } } }
};

test('golden: the starter template builds to the committed outputs', async () => {
  const tokens = JSON.parse(read('input.json'));
  const r = buildTokens(tokens);
  assert.deepEqual(r.problems, []);
  for (const f of r.files) assert.equal(f.content, read(`golden/${f.name}`), `${f.name} differs from cli/fixtures/tokens-build/golden/${f.name}`);
  assert.deepEqual(r.files.map((f) => f.name), ['tokens.css', 'tailwind.v3.cjs', 'tailwind.v3.mjs', 'tailwind.v4.css']);
});

test('the template stays in sync with the golden input', () => {
  assert.equal(read('input.json'), readFileSync(new URL('../../templates/tokens.json', import.meta.url), 'utf8'));
});

test('tokens build writes the four files into .craft/build, deterministically', async () => {
  const dir = project(JSON.parse(read('input.json')));
  const a = await run(['tokens', 'build', '--json', '--cwd', dir]);
  assert.equal(a.code, EXIT.OK, a.stderr);
  assert.deepEqual(a.json().files, ['.craft/build/tokens.css', '.craft/build/tailwind.v3.cjs', '.craft/build/tailwind.v3.mjs', '.craft/build/tailwind.v4.css']);
  const first = readdirSync(join(dir, '.craft', 'build')).map((f) => readFileSync(join(dir, '.craft', 'build', f), 'utf8'));
  assert.equal((await run(['tokens', 'build', '--cwd', dir])).code, EXIT.OK);
  const second = readdirSync(join(dir, '.craft', 'build')).map((f) => readFileSync(join(dir, '.craft', 'build', f), 'utf8'));
  assert.deepEqual(second, first);
  for (const c of first) assert.ok(c.includes(HEADER));
  assert.deepEqual(readdirSync(dir).sort(), ['.craft'], 'nothing is written outside .craft/');
});

test('three themes: dark follows prefers-color-scheme, every theme gets a data-theme block', () => {
  const r = buildTokens(/** @type {any} */ (MINIMAL));
  assert.deepEqual(r.problems, []);
  const css = r.files[0].content;
  assert.match(css, /:root \{[\s\S]*--color-text: var\(--primitive-color-ink\);[\s\S]*--card-padding: var\(--space-gap\);/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n {2}:root:not\(\[data-theme\]\) \{\n {4}--color-text: var\(--primitive-color-paper\);/);
  assert.match(css, /\[data-theme="contrast"\] \{\n {2}--color-text: var\(--primitive-color-yellow\);\n {2}--card-border: var\(--primitive-color-yellow\);\n\}/);
  assert.match(css, /\[data-theme="light"\] \{/);
  assert.ok(!/--color-line:.*\n[^:]*\[data-theme/.test(css));
  const v4 = r.files[3].content;
  assert.match(v4, /@theme \{\n {2}--color-text: var\(--primitive-color-ink\);\n {2}--color-line: #888888;\n {2}--spacing-gap: var\(--primitive-space-2\);\n\}/);
  assert.match(v4, /--card-padding: var\(--spacing-gap\);/);
  const v3 = r.files[1].content;
  assert.match(v3, /"text": "var\(--color-text\)"/);
  assert.match(v3, /module\.exports = /);
  assert.match(r.files[2].content, /export default /);
});

test('a single-theme file has no theme blocks', () => {
  const r = buildTokens(/** @type {any} */ ({ ...MINIMAL, themes: ['light'], semantic: { color: { text: '#111111' } }, component: undefined }));
  assert.deepEqual(r.problems, []);
  assert.ok(!r.files[0].content.includes('data-theme]') && !r.files[0].content.includes('[data-theme='));
});

test('schema-invalid, unresolved, unsafe, and colliding tokens exit 1 with messages', async () => {
  const bad = await run(['tokens', 'build', '--json', '--cwd', project({ schemaVersion: '1.0' })]);
  assert.equal(bad.code, EXIT.FINDINGS);
  assert.equal(bad.json().status, 'invalid');
  assert.ok(bad.json().errors.length > 0);

  const notJson = await run(['tokens', 'build', '--cwd', project('{ nope')]);
  assert.equal(notJson.code, EXIT.FINDINGS);
  assert.match(notJson.stdout, /not valid JSON/);

  const unresolved = structuredClone(MINIMAL);
  unresolved.semantic.space.gap = '{primitive.space.9}';
  const u = await run(['tokens', 'build', '--json', '--cwd', project(unresolved)]);
  assert.equal(u.code, EXIT.FINDINGS);
  assert.match(u.json().errors.join('\n'), /Unknown token "primitive\.space\.9"/);

  const unsafe = structuredClone(MINIMAL);
  /** @type {any} */ (unsafe.primitive.color).ink = 'red; } body { display: none';
  const s = await run(['tokens', 'build', '--json', '--cwd', project(unsafe)]);
  assert.equal(s.code, EXIT.FINDINGS);
  assert.match(s.json().errors.join('\n'), /not allowed in a CSS value/);

  const collide = structuredClone(MINIMAL);
  /** @type {any} */ (collide).component = { color: { text: '#000000' } };
  const c = buildTokens(/** @type {any} */ (collide));
  assert.match(c.problems.join('\n'), /both become --color-text/);
});

test('missing token file exits 3; bad subcommand or --out outside .craft/ exits 2', async () => {
  const dir = project();
  const missing = await run(['tokens', 'build', '--json', '--cwd', dir]);
  assert.equal(missing.code, EXIT.UNAVAILABLE);
  assert.equal(missing.json().status, 'unavailable');
  assert.equal((await run(['tokens', '--cwd', dir])).code, EXIT.USAGE);
  assert.equal((await run(['tokens', 'emit', '--cwd', dir])).code, EXIT.USAGE);
  const full = project(MINIMAL);
  for (const out of ['dist', '../elsewhere', '/tmp', '.craft/../src']) {
    const r = await run(['tokens', 'build', '--out', out, '--cwd', full]);
    assert.equal(r.code, EXIT.USAGE, out);
    assert.match(r.stderr, /inside/);
  }
  const ok = await run(['tokens', 'build', '--out', '.craft/custom', '--cwd', full]);
  assert.equal(ok.code, EXIT.OK);
  assert.ok(existsSync(join(full, '.craft', 'custom', 'tokens.css')));
});
