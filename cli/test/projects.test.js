// End-to-end checks on the fixture projects in cli/fixtures/projects/ (P2 gate:
// the sloppy fixture is flagged, the clean ones pass, 500 files lint in under 10 s).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runLint } from '../src/lint.js';
import { main, EXIT } from '../src/cli.js';
import { validateAgainst } from '../src/schemas.js';
import { checkPairs } from '../src/tokens.js';

const PROJECTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'projects');
/** @param {string[]} args */
async function run(args) {
  let stdout = '';
  const code = await main(args, { stdout: (s) => { stdout += s; }, stderr: () => {} });
  return { code, stdout, json: () => JSON.parse(stdout) };
}

test('sloppy-site is flagged by most rules, with blocking findings', () => {
  const r = runLint(join(PROJECTS, 'sloppy-site'));
  const rules = new Set(r.findings.map((f) => f.ruleId));
  for (const id of ['tok/hardcoded', 'tok/unknown-var', 'lay/card-depth', 'lay/clone-grid', 'vis/default-stack', 'vis/gradient-text', 'con/fabricated', 'mot/no-reduced', 'a11y/focus', 'a11y/alt', 'a11y/contrast', 'a11y/semantics', 'rsp/viewport', 'imm/no-fallback', 'imm/unbounded-loop']) {
    assert.ok(rules.has(id), `sloppy-site should trigger ${id}`);
  }
  assert.ok(r.summary.block >= 5, `expected blocking findings, got ${r.summary.block}`);
});

for (const name of ['clean-site', 'next-tailwind', 'html-css', 'r3f-scene']) {
  test(`${name} has no block or warn findings`, () => {
    const r = runLint(join(PROJECTS, name));
    assert.deepEqual(r.findings.filter((f) => f.severity !== 'info').map((f) => `${f.ruleId} ${f.file}:${f.line} ${f.message}`), []);
    assert.deepEqual(r.parseErrors, []);
  });
}

test('clean-site reaches T0 in the proof report', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'craft-clean-'));
  cpSync(join(PROJECTS, 'clean-site'), dir, { recursive: true });
  const r = await run(['report', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.OK, r.stdout);
  assert.equal(r.json().highestTier, 'T0');
});

test('init --from-repo drafts schema-valid tokens from shadcn-style variables without executing anything', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'craft-extract-'));
  cpSync(join(PROJECTS, 'next-tailwind'), dir, { recursive: true });
  const r = await run(['init', '--from-repo', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.OK);
  assert.equal(r.json().extracted, true);
  const tokens = JSON.parse(readFileSync(join(dir, '.craft', 'tokens.json'), 'utf8'));
  assert.deepEqual(validateAgainst('tokens', tokens).errors, []);
  assert.equal(tokens.meta.source, 'extracted');
  assert.deepEqual(tokens.themes, ['light', 'dark']);
  for (const role of ['surface', 'surface-raised', 'text', 'text-muted', 'accent', 'on-accent', 'border', 'focus', 'danger']) {
    assert.ok(tokens.semantic.color[role], `role ${role}`);
  }
  assert.equal(tokens.primitive.color.background, '#ffffff');
  assert.equal(tokens.primitive.color['background-dark'], '#111316');
  assert.equal(tokens.primitive.radius.radius, '6px');
  const results = checkPairs(tokens);
  assert.ok(results.length >= 10);
  assert.deepEqual(results.filter((x) => x.status !== 'pass').map((x) => `${x.theme} ${x.pair.fg}/${x.pair.bg} ${x.ratio}`), []);
  assert.ok(existsSync(join(dir, '.craft', 'reports', 'extraction.md')));

  // A second run keeps the existing tokens and writes the draft beside the reports.
  writeFileSync(join(dir, '.craft', 'tokens.json'), JSON.stringify({ ...tokens, name: 'mine' }));
  await run(['init', '--from-repo', '--cwd', dir]);
  assert.equal(JSON.parse(readFileSync(join(dir, '.craft', 'tokens.json'), 'utf8')).name, 'mine');
  assert.ok(existsSync(join(dir, '.craft', 'reports', 'tokens.extracted.json')));
});

test('init --from-repo reads Tailwind config colors from the AST', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'craft-twcfg-'));
  writeFileSync(join(dir, 'tailwind.config.js'), "module.exports = { theme: { extend: { colors: { brand: { DEFAULT: '#8a3b12', 50: '#fbf3ee' }, ink: '#22201c', dynamic: process.env.X } } } };\n");
  const r = await run(['init', '--from-repo', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.OK);
  const tokens = JSON.parse(readFileSync(join(dir, '.craft', 'tokens.json'), 'utf8'));
  assert.deepEqual(tokens.primitive.color, { brand: '#8a3b12', 'brand-50': '#fbf3ee', ink: '#22201c' });
});

test('Tier 0 lints 500 files in under 10 seconds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'craft-perf-'));
  const sources = ['src/Landing.jsx', 'src/styles.css', 'index.html', 'src/Background.js'].map((f) => [f, readFileSync(join(PROJECTS, 'sloppy-site', f), 'utf8')]);
  for (let i = 0; i < 500; i++) {
    const [file, text] = sources[i % sources.length];
    const target = join(dir, `pkg${Math.floor(i / 50)}`, `${i}-${file.replace(/\//g, '-')}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
  const started = performance.now();
  const r = runLint(dir);
  const ms = performance.now() - started;
  assert.equal(r.files.length, 500);
  assert.ok(ms < 10000, `took ${Math.round(ms)} ms`);
  process.stdout.write(`# perf: 500 files in ${Math.round(ms)} ms\n`);
});
