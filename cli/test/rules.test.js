// Every rule has a positive fixture (must fire) and, where meaningful, a negative fixture
// (must not fire at warn or block). Fixtures live in cli/fixtures/rules/<prefix>/<name>/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLint } from '../src/lint.js';
import { RULES } from '../rules/index.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'rules');
/** Rules that need a rendered page (craft shoot) and therefore have no static fixture. */
const RENDERED_ONLY = new Set(RULES.filter((r) => !r.check && r.tier === 'T2').map((r) => r.id));

for (const rule of RULES) {
  if (RENDERED_ONLY.has(rule.id)) continue;
  const dir = join(FIXTURES, rule.id);

  test(`${rule.id}: positive fixture fires`, () => {
    assert.ok(existsSync(join(dir, 'positive')), `missing fixture ${rule.id}/positive`);
    const r = runLint(join(dir, 'positive'), { rules: [rule.id] });
    const hits = r.findings.filter((f) => f.ruleId === rule.id);
    assert.ok(hits.length > 0, `${rule.id} found nothing in its positive fixture`);
    assert.ok(hits.some((f) => f.severity === rule.severity), `${rule.id} positive fixture should produce its default severity (${rule.severity})`);
    for (const f of hits) {
      assert.ok(f.message.length > 0 && f.remediation.length > 0, 'finding needs a message and a remediation');
      assert.ok(f.confidence > 0 && f.confidence <= 1);
    }
  });

  test(`${rule.id}: negative fixture is clean`, () => {
    assert.ok(existsSync(join(dir, 'negative')), `missing fixture ${rule.id}/negative`);
    const r = runLint(join(dir, 'negative'), { rules: [rule.id] });
    const hits = r.findings.filter((f) => f.ruleId === rule.id && f.severity !== 'info');
    assert.deepEqual(hits.map((f) => `${f.file}:${f.line ?? ''} ${f.message}`), []);
  });
}

test('rendered-only rules are reported as not run by lint', () => {
  const r = runLint(join(FIXTURES, 'a11y', 'alt', 'negative'));
  assert.deepEqual(r.rulesRenderedOnly.sort(), [...RENDERED_ONLY].sort());
});

test('tok/hardcoded only summarizes literals when the project has no tokens of that kind', () => {
  const dir = mkdtempSync(join(tmpdir(), 'craft-notokens-'));
  writeFileSync(join(dir, 'a.css'), '.a { color: #123456; padding: 13px; }\n.b { color: #654321; }\n');
  const r = runLint(dir, { rules: ['tok/hardcoded'] });
  assert.deepEqual(r.findings.map((f) => f.severity), ['info', 'info']);
  assert.match(r.findings.find((f) => /color/.test(f.message))?.message ?? '', /^2 literal color value/);
});

/**
 * Lint a throwaway project made of the given files.
 * @param {Record<string, string>} files
 * @param {string[]} rules
 */
function lintFiles(files, rules) {
  const dir = mkdtempSync(join(tmpdir(), 'craft-case-'));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return runLint(dir, { rules }).findings.filter((f) => f.severity !== 'info');
}

const PAGE = (body) => `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>t</title></head><body><main>${body}</main></body></html>`;
const CARD_CSS = '.card, .menu, .badge { border: 1px solid #ccc; border-radius: 8px; padding: 8px; background: #fff; box-shadow: 0 1px 2px #0002; }';

// Cases found while measuring false positives on open-source repos (docs/evals/false-positives.md).
test('false-positive cases from open-source repos stay quiet', () => {
  assert.deepEqual(lintFiles({ 'index.html': PAGE('<div class="card"><div id="dropdown" class="menu">Menu</div><span class="badge">New</span></div>'), 'a.css': CARD_CSS }, ['lay/card-depth']), []);
  assert.deepEqual(lintFiles({ 'index.html': PAGE('<div><div><h3>Q1</h3><p>A1</p></div><div><h3>Q2</h3><p>A2</p></div><div><h3>Q3</h3><p>A3</p></div></div>') }, ['lay/clone-grid']), []);
  assert.deepEqual(lintFiles({ 'index.html': PAGE('<button>Go</button>'), 'a.css': 'button:focus { outline: none; background-color: #5e3370; }' }, ['a11y/focus']), []);
  assert.deepEqual(lintFiles({ 'base.html': '<!doctype html><html lang="en"><head>{{ partial "header" . }}</head><body>{{ block "main" . }}{{ end }}</body></html>' }, ['rsp/viewport', 'a11y/semantics']), []);
  assert.deepEqual(lintFiles({ 'pricing.html': PAGE('<ul><li>Team size: <span>100+ developers</span></li></ul>') }, ['con/fabricated']), []);
  assert.deepEqual(lintFiles({ 'a.css': 'html { transition: all 0.5s ease-in; }' }, ['mot/no-reduced']), []);
  // Two demo sites in one repo: only the one with a color scale is held to it.
  const demos = lintFiles({
    'one/index.html': PAGE('<p>1</p>'), 'one/style.css': ':root { --a: #111; --b: #222; --c: #333; }\n.x { color: #444; }',
    'two/index.html': PAGE('<p>2</p>'), 'two/style.css': '.y { color: #555; }'
  }, ['tok/hardcoded']);
  assert.deepEqual(demos.map((f) => f.file), ['one/style.css']);
  // Copied-in libraries (own LICENSE, no package.json) and compiled framework CSS are not linted.
  assert.deepEqual(lintFiles({ 'lib/cm/LICENSE': 'MIT', 'lib/cm/cm.css': '.cm:focus { outline: none; }', 'out.css': '/*! tailwindcss v3.1.4 | MIT License */\n.a:focus { outline: none; }' }, ['a11y/focus']), []);
  assert.deepEqual(lintFiles({ 'index.html': PAGE('<div class="hidden w-[572px] lg:block">Side</div><div aria-hidden="true"><div class="w-[480px]"></div></div>') }, ['rsp/viewport']), []);
  assert.deepEqual(lintFiles({ 'index.html': PAGE('<svg><style>.st0{fill:#0acf83}</style></svg>'), 'a.css': ':root { --a: #111; --b: #222; --c: #333; }' }, ['tok/hardcoded']), []);
  assert.deepEqual(lintFiles({ 'index.html': PAGE('<pre><code>&lt;p&gt;Lorem ipsum dolor sit amet&lt;/p&gt;</code></pre>') }, ['con/fabricated']), []);
  // Custom property names are case-sensitive.
  assert.deepEqual(lintFiles({ 'a.css': '.a { --text-GRAD: 1; } .b { font-weight: var(--text-GRAD); }' }, ['tok/unknown-var']), []);
});

test('a reasoned craft-allow suppresses the finding and is listed as an exception', () => {
  const r = runLint(join(FIXTURES, 'exc', 'unreasoned', 'negative'), { rules: ['tok/hardcoded', 'exc/unreasoned'] });
  assert.equal(r.findings.length, 0);
  assert.equal(r.exceptions.length, 1);
  assert.equal(r.exceptions[0].ruleId, 'tok/hardcoded');
  assert.match(r.exceptions[0].reason, /logo guidelines/);
});
