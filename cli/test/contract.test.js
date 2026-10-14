import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkDesignMd, checkContract } from '../src/contract.js';

const template = readFileSync(new URL('../../templates/DESIGN.md', import.meta.url), 'utf8');

/** @param {string} text */
const fill = (text) => text.replace(/\{\{[^}]*\}\}/g, 'filled value');

test('template has every section; only placeholders are reported', () => {
  const findings = checkDesignMd(template);
  assert.ok(findings.length > 0);
  assert.ok(findings.every((f) => f.severity === 'warn' && /placeholder/.test(f.message)));
});

test('filled template passes cleanly', () => {
  assert.deepEqual(checkDesignMd(fill(template)), []);
});

test('missing section and missing axis are blocking', () => {
  const noSignature = fill(template).replace(/## 3\. Signature move[\s\S]*?(?=## 4)/, '');
  const f = checkDesignMd(noSignature);
  assert.ok(f.some((x) => x.severity === 'block' && /Signature move/.test(x.message)));
  const noDensity = fill(template).replace(/^\| Density .*\n/m, '');
  assert.ok(checkDesignMd(noDensity).some((x) => /"density" axis/.test(x.message)));
});

test('axis without reason is blocking', () => {
  const text = fill(template).replace(/^\| Density \| filled value \| filled value \|$/m, '| Density | compact | |');
  assert.ok(checkDesignMd(text).some((x) => /"density" has no reason/.test(x.message)));
});

test('over-long DESIGN.md is blocking', () => {
  const long = fill(template) + '\n'.repeat(120) + 'x\n';
  assert.ok(checkDesignMd(long).some((x) => /lines; the limit is 150/.test(x.message)));
  assert.ok(checkDesignMd(fill(template), { maxLines: 30 }).some((x) => /limit is 30/.test(x.message)));
});

test('checkContract on a project directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'craft-contract-'));
  assert.match(checkContract(dir).findings[0].message, /\.craft\/ is missing/);
  mkdirSync(join(dir, '.craft'));
  writeFileSync(join(dir, '.craft', 'DESIGN.md'), fill(template));
  copyFileSync(new URL('../../templates/tokens.json', import.meta.url), join(dir, '.craft', 'tokens.json'));
  copyFileSync(new URL('../../templates/craft.config.json', import.meta.url), join(dir, '.craft', 'craft.config.json'));
  let r = checkContract(dir);
  assert.deepEqual(r.findings.map((f) => f.message), ['decisions.md is missing.']);
  writeFileSync(join(dir, '.craft', 'decisions.md'), '# Decisions\n');
  r = checkContract(dir);
  assert.deepEqual(r.findings, []);
  writeFileSync(join(dir, '.craft', 'tokens.json'), '{ nope');
  assert.match(checkContract(dir).findings[0].message, /Invalid JSON/);
});
