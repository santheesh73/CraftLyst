// Tests for the paired evaluation harness (P3). The agent is always the stub in fixtures/;
// real Claude Code is never spawned here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { assignOrder, auditClaims, buildAgentArgv, listFiles, pairIds, parseClaims, redact, seededRandom, wilson, winRate } from '../harness/lib.js';
import { buildBundles, scanForLeaks, renderForm, briefToHtml } from '../harness/bundle.js';
import { scoreHuman, scoreAutomated } from '../harness/aggregate.js';

const here = dirname(fileURLToPath(import.meta.url));
const harness = join(here, '..', 'harness');
const stub = join(here, '..', 'fixtures', 'stub-agent.js');
const tmp = () => mkdtempSync(join(tmpdir(), 'craft-harness-test-'));

test('agent command template: {prompt} is one argument, never shell-split', () => {
  const argv = buildAgentArgv('claude -p {prompt} --flag "two words"', 'a; rm -rf / && echo "x"');
  assert.deepEqual(argv, ['claude', '-p', 'a; rm -rf / && echo "x"', '--flag', 'two words']);
  assert.throws(() => buildAgentArgv('claude -p', 'x'), /placeholder/);
});

test('pair ids include repeats', () => {
  assert.deepEqual(pairIds(['a'], 2).map((p) => p.pairId), ['a', 'a~r2']);
});

test('seeded randomization is reproducible and roughly balanced', () => {
  const r1 = seededRandom('s');
  const r2 = seededRandom('s');
  assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()]);
  assert.deepEqual(assignOrder('seed', 'p1'), assignOrder('seed', 'p1'));
  const ids = Array.from({ length: 200 }, (_, i) => `pair-${i}`);
  const skillFirst = ids.filter((id) => assignOrder('seed', id).A === 'skill').length;
  assert.ok(skillFirst > 70 && skillFirst < 130, `skill shown as A ${skillFirst}/200 times`);
  const other = ids.filter((id) => assignOrder('other-seed', id).A !== assignOrder('seed', id).A).length;
  assert.ok(other > 0, 'a different seed changes the order');
});

test('Wilson interval matches reference values', () => {
  const w = wilson(20, 30);
  assert.ok(w && Math.abs(w.low - 0.4878) < 1e-3 && Math.abs(w.high - 0.8077) < 1e-3);
  assert.equal(wilson(0, 0), null);
  assert.equal(wilson(0, 10)?.low, 0);
});

test('win rate counts ties as half', () => {
  const r = winRate(['skill', 'skill', 'tie', 'baseline']);
  assert.equal(r.rate, 2.5 / 4);
  assert.equal(r.ties, 1);
});

test('human scoring unblinds with the key and stays pending below N = 30', () => {
  const key = { pairs: { p1: { A: 'skill', B: 'baseline' }, p2: { A: 'baseline', B: 'skill' } } };
  const all = (/** @type {string} */ v) => Object.fromEntries(['specificity', 'hierarchy', 'composition', 'consistency', 'functionality', 'responsiveness', 'accessibility', 'maintainability', 'portability', 'honesty', 'overall'].map((d) => [d, v]));
  const s = scoreHuman([{ bundleId: 'p1', ratings: all('A') }, { bundleId: 'p2', ratings: all('tie') }, { bundleId: 'zz', ratings: all('A') }, { bundleId: 'p1', ratings: { overall: 'A' } }], key);
  assert.equal(s.overall.n, 2);
  assert.equal(s.overall.rate, 0.75);
  assert.equal(s.gate.status, 'pending');
  assert.equal(s.rejected.length, 2);
  const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`q${i}`, { A: 'baseline', B: 'skill' }]));
  const s30 = scoreHuman(Object.keys(many).map((id, i) => ({ bundleId: id, ratings: all(i < 20 ? 'B' : 'A') })), { pairs: many });
  assert.equal(s30.gate.status, 'met');
  assert.equal(scoreHuman([], key).gate.status, 'pending');
});

test('automated gates: reductions, zero-baseline inconclusive, honesty', () => {
  const m = (/** @type {number} */ slop, /** @type {number} */ axe, /** @type {number} */ claims, /** @type {number} */ matched) => ({ generation: { error: null }, slop: { total: slop }, rendered: { ran: true, axeViolations: axe }, build: { applicable: false }, honesty: { claims, matched } });
  const a = scoreAutomated([{ pairId: 'p', skill: m(4, 6, 2, 2), baseline: m(10, 10, 3, 0) }]);
  assert.equal(a.gates.slop.status, 'met');
  assert.equal(a.gates.axe.status, 'met');
  assert.equal(a.gates.honesty.status, 'met');
  assert.equal(a.gates.build.status, 'not applicable');
  const b = scoreAutomated([{ pairId: 'p', skill: m(0, 1, 2, 1), baseline: m(0, 0, 0, 0) }]);
  assert.equal(b.gates.axe.status, 'not met');
  assert.equal(b.gates.slop.status, 'inconclusive');
  assert.equal(b.gates.honesty.status, 'not met');
});

test('claims parser: verified sections, disclaimers, categories', () => {
  const text = [
    '**What I built**', '- A page with a hero.',
    '**Verified (and how)**', '- `craft lint`: 0 block, 0 warn.', '- Contrast pairs pass WCAG AA.',
    '**Notes**', 'I tested keyboard navigation and it works.', 'Overflow was not tested.', 'The hero uses a serif.',
    '**Not verified**', '- Rendering and axe. Playwright is not installed.', '- Everything passes, I hope.'
  ].join('\n');
  const claims = parseClaims(text);
  assert.deepEqual(claims.map((c) => c.categories), [['lint'], ['contrast'], ['accessibility']]);
  const audit = auditClaims(claims, [{ id: 't0.slop-lint', status: 'verified' }, { id: 't0.contrast', status: 'verified' }, { id: 't2.axe-light:index.html', status: 'failed' }]);
  assert.equal(audit.matched, 2);
  assert.equal(audit.unmatched, 1);
  assert.equal(parseClaims('Nothing was verified in a browser.').length, 0);
});

test('claims parser: the report lines that disclose are not claims', () => {
  const text = [
    'Highest tier reached: T1 (static)',
    'Verified: craft lint (0 block, 2 warn), craft contrast (26/26 AA)',
    'Not verified: rendered checks (Playwright not installed)',
    'Checked outside the receipt: my own Playwright script checked overflow at 320px.',
    '**Human checks:** open it at 320px and tab through with a keyboard.',
    'I checked overflow at 320px myself.'
  ].join('\n');
  assert.deepEqual(parseClaims(text).map((c) => c.categories), [['contrast', 'lint'], ['responsive']]);
});

test('redaction: code comments with markers are dropped, prose is marked', () => {
  const code = redact('/* Tokens mirror .craft/tokens.json */\nbody { color: red; }\n', 'code');
  assert.equal(code.text.trim(), 'body { color: red; }');
  assert.equal(code.redactions, 1);
  assert.match(redact('Ran craft lint and Tier 2.').text, /^Ran \[redacted\] and \[redacted\]\.$/);
  assert.equal(redact('Print your receipt', 'code').text, 'Print your receipt', 'product words survive in code');
});

test('bundles: no arm leakage, key outside bundles, form has a11y basics', () => {
  const run = tmp();
  for (const arm of ['skill', 'baseline']) {
    const ev = join(run, '01-developer-portfolio', arm, 'eval');
    mkdirSync(join(ev, '.craft', 'reports', 'shots'), { recursive: true });
    mkdirSync(join(ev, '.claude', 'skills', 'frontend-craft'), { recursive: true });
    writeFileSync(join(ev, '.claude', 'skills', 'frontend-craft', 'SKILL.md'), 'x\n');
    writeFileSync(join(ev, '.craft', 'DESIGN.md'), 'contract\n');
    writeFileSync(join(ev, '.craft', 'reports', 'shots', 'index-html-1280.png'), 'png');
    writeFileSync(join(ev, 'index.html'), `<!-- built with Frontend Craft -->\n<p>${arm === 'skill' ? 'Hello <!-- craft-allow tok/hardcoded: ok -->' : 'Hello'}</p>\n`);
    writeFileSync(join(ev, 'styles.css'), '/* see DESIGN.md */\nbody { margin: 0; }\n');
    writeFileSync(join(run, '01-developer-portfolio', arm, 'final.md'), 'I ran craft lint (Tier 0) and wrote a proof report.\n');
  }
  const r = buildBundles(run, { seed: 'test', answers: true });
  assert.deepEqual(r.bundles, ['01-developer-portfolio']);
  assert.deepEqual(r.leaks, []);
  const bundle = join(run, 'bundles', '01-developer-portfolio');
  const files = listFiles(bundle);
  assert.ok(files.includes('form.html') && files.includes('A/site/index.html') && files.includes('B/shots/index-html-1280.png'));
  assert.ok(!files.some((f) => /(^|\/)\.(craft|claude)\//.test(f) || /skill|baseline|key\.json/.test(f)), files.join(','));
  for (const side of ['A', 'B']) {
    const html = readFileSync(join(bundle, side, 'site', 'index.html'), 'utf8');
    assert.doesNotMatch(html, /craft/i);
    assert.match(html, /<p>Hello ?<\/p>/, 'product markup survives redaction');
  }
  assert.ok(existsSync(join(run, 'key.json')));
  assert.deepEqual(JSON.parse(readFileSync(join(run, 'key.json'), 'utf8')).pairs['01-developer-portfolio'], assignOrder('test', '01-developer-portfolio'));
  // A planted leak is caught.
  writeFileSync(join(bundle, 'A', 'site', 'leak.css'), '/* frontend-craft */\n');
  assert.equal(scanForLeaks(bundle).length, 1);
  const form = renderForm({ bundleId: 'x', briefTitle: 'T', briefHtml: briefToHtml('# T\n\nSome **text**.'), shots: { A: [], B: [] }, hasAnswers: false, entry: 'index.html' });
  assert.match(form, /<html lang="en">/);
  assert.match(form, /name="viewport"/);
  assert.match(form, /:focus-visible/);
  assert.ok((form.match(/<legend>/g) ?? []).length === 11, 'ten dimensions plus overall');
  assert.doesNotMatch(form, /https?:\/\//, 'no network URLs in the form');
});

test('run.js --dry-run lists generations and spawns nothing', () => {
  const out = tmp();
  const r = spawnSync(process.execPath, [join(harness, 'run.js'), '--dry-run', '--briefs', '01-developer-portfolio,06-redesign-existing-codebase', '--out', out, '--skill-dir', out], { encoding: 'utf8' });
  assert.equal(r.status, 3, 'skill arm needs a packaged skill');
  const ok = spawnSync(process.execPath, [join(harness, 'run.js'), '--dry-run', '--briefs', '01-developer-portfolio,06-redesign-existing-codebase', '--arms', 'baseline', '--repeats', '2', '--out', out], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /4 generation\(s\)/);
  assert.match(ok.stdout, /06-redesign-existing-codebase~r2 baseline/);
  assert.deepEqual(readdirSync(out), [], 'dry run writes nothing');
});

test('end to end with the stub agent: run, metrics (no render), bundle, aggregate', () => {
  const out = tmp();
  const skill = tmp();
  writeFileSync(join(skill, 'SKILL.md'), '---\nname: frontend-craft\n---\n');
  const agent = `${process.execPath} ${stub} {prompt}`;
  const run = spawnSync(process.execPath, [join(harness, 'run.js'), '--briefs', '06-redesign-existing-codebase', '--out', out, '--run-id', 't1', '--skill-dir', skill, '--agent-cmd', agent, '--timeout', '60'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr + run.stdout);
  const pair = join(out, 't1', '06-redesign-existing-codebase');
  assert.ok(existsSync(join(pair, 'skill', 'workspace', '.claude', 'skills', 'frontend-craft', 'SKILL.md')));
  assert.ok(!existsSync(join(pair, 'baseline', 'workspace', '.claude')));
  assert.ok(existsSync(join(pair, 'baseline', 'workspace', 'styles.css')), 'seed copied');
  assert.match(readFileSync(join(pair, 'skill', 'final.md'), 'utf8'), /Verified/);
  const met = spawnSync(process.execPath, [join(harness, 'metrics.js'), '--run-id', 't1', '--out', out, '--skip-shoot'], { encoding: 'utf8' });
  assert.equal(met.status, 0, met.stderr);
  const m = JSON.parse(readFileSync(join(pair, 'skill', 'metrics.json'), 'utf8'));
  assert.equal(typeof m.slop.total, 'number');
  assert.equal(m.honesty.claims, 1);
  assert.equal(m.honesty.matched, 0, 'no receipts, so the claim is unbacked');
  const b = spawnSync(process.execPath, [join(harness, 'bundle.js'), '--run-id', 't1', '--out', out, '--seed', 's'], { encoding: 'utf8' });
  assert.equal(b.status, 0, b.stderr);
  const results = tmp();
  const ag = spawnSync(process.execPath, [join(harness, 'aggregate.js'), '--run-id', 't1', '--out', out, '--results', results], { encoding: 'utf8' });
  assert.equal(ag.status, 0, ag.stderr);
  const summary = JSON.parse(readFileSync(join(results, 't1', 'summary.json'), 'utf8'));
  assert.equal(summary.human.gate.status, 'pending');
  assert.match(summary.verdict, /PENDING/);
  assert.match(readFileSync(join(results, 't1', 'summary.md'), 'utf8'), /## Human blind ranking[\s\S]*## Automated metrics/);
});
