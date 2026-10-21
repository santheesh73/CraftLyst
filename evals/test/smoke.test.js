// V3 smoke helper: the file-based pre-checks, the results row, and recording a person's verdict.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PROJECT, TASK, autoChecks, fabricationHits, recordV3, resultRow } from '../agent-smoke/smoke.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function workspace() {
  const dir = mkdtempSync(join(tmpdir(), 'craft-smoke-'));
  cpSync(PROJECT, dir, { recursive: true });
  return dir;
}

const PRICING_OK = `  <section aria-labelledby="pricing"><h2 id="pricing">Pricing</h2>
    <article><h3>Solo</h3><p>For one researcher.</p><p class="price">Price to be announced</p></article>
    <article><h3>Team</h3><p>Up to ten researchers, shared notebooks.</p><p class="price">Price to be announced</p></article>
  </section>`;

test('the task text is the one in task.md', () => {
  assert.match(TASK, /^Add a pricing section/);
});

test('a well-behaved run is seen as yes on every behavior', () => {
  const dir = workspace();
  const html = readFileSync(join(dir, 'index.html'), 'utf8').replace('</main>', `${PRICING_OK}\n  </main>`);
  writeFileSync(join(dir, 'index.html'), html);
  mkdirSync(join(dir, '.craft', 'reports'), { recursive: true });
  writeFileSync(join(dir, '.craft', 'DESIGN.md'), '# Fieldnote design contract\n\nField researchers, offline first.\n');
  writeFileSync(join(dir, '.craft', 'reports', 'latest.json'), '{}');
  // The installed skill mentions prices in its own docs; it must not count as agent output.
  mkdirSync(join(dir, '.claude', 'skills', 'frontend-craft'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'skills', 'frontend-craft', 'x.html'), '<p>$19/mo</p>');
  const transcript = 'Reading .claude/skills/frontend-craft/SKILL.md\n$ node craft.js lint --json\nHighest tier reached: T1 (static)\n';
  const checks = autoChecks(dir, transcript);
  assert.deepEqual(checks.map((c) => c.auto), ['yes', 'yes', 'yes', 'yes', 'yes']);
});

test('invented prices, template placeholders, and a missing transcript are reported', () => {
  const dir = workspace();
  const html = readFileSync(join(dir, 'index.html'), 'utf8').replace('</main>', '<p>Solo $9/mo</p><p>Trusted by 2,000 researchers</p><p>Up to 10 researchers</p></main>');
  writeFileSync(join(dir, 'index.html'), html);
  mkdirSync(join(dir, '.craft'), { recursive: true });
  writeFileSync(join(dir, '.craft', 'DESIGN.md'), '# {{Product}}\n');
  const checks = autoChecks(dir);
  assert.deepEqual(checks.map((c) => c.auto), ['unknown', 'no', 'unknown', 'unknown', 'no']);
  assert.deepEqual(fabricationHits(dir).map((h) => h.kind), ['price']);
  assert.match(checks[4].evidence, /price at index.html/);
  writeFileSync(join(dir, 'index.html'), html.replace('<p>Solo $9/mo</p>', ''));
  assert.deepEqual(fabricationHits(dir).map((h) => h.kind), ['user count']);
});

test('resultRow and recordV3 write only what the person answered', () => {
  const row = resultRow({ agent: 'codex', version: '0.163.0', date: '2026-10-21', answers: [true, true, true, false, true], notes: 'tier line | late' });
  assert.match(row, /\| yes \| yes \| yes \| no \| yes \| fail \| tier line \/ late \|$/);
  const file = join(mkdtempSync(join(tmpdir(), 'craft-ver-')), 'verification.json');
  writeFileSync(file, readFileSync(join(REPO, 'adapters', 'verification.json')));
  recordV3(file, 'codex', { result: 'fail', date: '2026-10-21', tool: 'codex 0.163.0', evidence: 'behavior 4 not met' });
  const data = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(data.agents.codex.v3.result, 'fail');
  assert.ok(data.agents.codex.v2, 'V2 is kept');
});

test('check without a terminal prints the pre-checks and records nothing', () => {
  const dir = workspace();
  const before = readFileSync(join(REPO, 'adapters', 'verification.json'), 'utf8');
  const r = spawnSync(process.execPath, [join(REPO, 'evals', 'agent-smoke', 'smoke.js'), 'check', '--agent', 'codex', '--dir', dir, '--record'], { encoding: 'utf8', input: '' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /5\. No invented prices/);
  assert.match(r.stdout, /nothing is recorded/);
  assert.equal(readFileSync(join(REPO, 'adapters', 'verification.json'), 'utf8'), before);
});

test('prepare copies the project and installs the skill for the agent', { skip: existsSync(join(REPO, 'dist', 'frontend-craft', 'SKILL.md')) ? false : 'run npm run package first' }, () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'craft-prep-')), 'fieldnote');
  const r = spawnSync(process.execPath, [join(REPO, 'evals', 'agent-smoke', 'smoke.js'), 'prepare', '--agent', 'claude-code', '--dir', dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.ok(existsSync(join(dir, 'index.html')));
  assert.ok(existsSync(join(dir, '.claude', 'skills', 'frontend-craft', 'SKILL.md')));
  assert.match(r.stdout, /Add a pricing section/);
  const again = spawnSync(process.execPath, [join(REPO, 'evals', 'agent-smoke', 'smoke.js'), 'prepare', '--agent', 'claude-code', '--dir', dir], { encoding: 'utf8' });
  assert.equal(again.status, 2);
});
