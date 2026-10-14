// Every rule has a positive fixture (must fire) and, where meaningful, a negative fixture
// (must not fire at warn or block). Fixtures live in cli/fixtures/rules/<prefix>/<name>/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
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

test('a reasoned craft-allow suppresses the finding and is listed as an exception', () => {
  const r = runLint(join(FIXTURES, 'exc', 'unreasoned', 'negative'), { rules: ['tok/hardcoded', 'exc/unreasoned'] });
  assert.equal(r.findings.length, 0);
  assert.equal(r.exceptions.length, 1);
  assert.equal(r.exceptions[0].ruleId, 'tok/hardcoded');
  assert.match(r.exceptions[0].reason, /logo guidelines/);
});
