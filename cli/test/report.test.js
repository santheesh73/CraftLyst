import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main, EXIT } from '../src/cli.js';
import { highestTier, buildReport, checkReport } from '../src/report.js';
import { contentHash } from '../src/hash.js';
import { validateAgainst } from '../src/schemas.js';

/** @param {string[]} args */
async function run(args) {
  let stdout = '';
  const code = await main(args, { stdout: (s) => { stdout += s; }, stderr: () => {} });
  return { code, stdout, json: () => JSON.parse(stdout) };
}
const tmp = () => mkdtempSync(join(tmpdir(), 'craft-report-'));

test('highestTier stops at the first tier that failed or verified nothing', () => {
  /** @type {any[]} */
  const c = [
    { id: 'a', tier: 'T0', status: 'verified', evidence: 'x' },
    { id: 'b', tier: 'T1', status: 'verified', evidence: 'x' },
    { id: 'c', tier: 'T1', status: 'not_verified', reason: 'x' },
    { id: 'd', tier: 'T2', status: 'failed', evidence: 'x' },
    { id: 'e', tier: 'T3', status: 'verified', evidence: 'x' }
  ];
  assert.equal(highestTier(c), 'T1');
  assert.equal(highestTier([{ id: 'a', tier: 'T0', status: 'failed', evidence: 'x' }]), 'none');
  assert.equal(highestTier([]), 'none');
});

test('content hash changes when a covered file changes and ignores reports', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'a.css'), '.a { color: red; }');
  const h1 = contentHash(dir);
  assert.equal(h1.fileCount, 1);
  assert.equal(contentHash(dir).value, h1.value, 'stable');
  writeFileSync(join(dir, 'notes.txt'), 'not covered');
  assert.equal(contentHash(dir).value, h1.value, 'uncovered files do not count');
  writeFileSync(join(dir, 'a.css'), '.a { color: blue; }');
  assert.notEqual(contentHash(dir).value, h1.value);
});

test('report is schema-valid, honest about missing tiers, and goes stale on edit', async () => {
  const dir = tmp();
  await run(['init', '--cwd', dir]);
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>x</title></head><body><main><h1>Ledger</h1></main></body></html>');
  const report = buildReport(dir);
  assert.deepEqual(validateAgainst('report', report).errors, []);
  const byId = Object.fromEntries(report.checks.map((/** @type {any} */ c) => [c.id, c]));
  assert.equal(byId['t0.slop-lint'].status, 'verified');
  assert.equal(byId['t0.contrast'].status, 'verified');
  assert.equal(byId['t1.audit'].status, 'not_verified');
  assert.equal(byId['t2.shoot'].status, 'not_verified');
  assert.equal(byId['t2.a11y/target'].status, 'not_verified');
  assert.equal(report.highestTier, 'T0');

  assert.equal(checkReport(dir).status, 'missing');
  const w = await run(['report', '--cwd', dir]);
  assert.equal(w.code, EXIT.OK, w.stdout);
  assert.ok(existsSync(join(dir, '.craft', 'reports', 'latest.md')));
  assert.match(readFileSync(join(dir, '.craft', 'reports', 'latest.md'), 'utf8'), /⚠️ Not verified/);
  assert.equal((await run(['report', '--check', '--cwd', dir])).code, EXIT.OK);
  writeFileSync(join(dir, 'index.html'), '<p>changed</p>');
  const stale = await run(['report', '--check', '--json', '--cwd', dir]);
  assert.equal(stale.code, EXIT.FINDINGS);
  assert.equal(stale.json().status, 'stale');
});

test('report fails T0 on blocking findings', async () => {
  const dir = tmp();
  writeFileSync(join(dir, 'a.html'), '<img src="x.png">');
  const r = await run(['report', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.FINDINGS);
  assert.equal(r.json().highestTier, 'none');
  const report = JSON.parse(readFileSync(join(dir, '.craft', 'reports', 'latest.json'), 'utf8'));
  assert.equal(report.checks.find((/** @type {any} */ c) => c.id === 't0.contract').status, 'not_verified', 'a reports-only .craft is not a contract');
});

test('audit runs project scripts, records pass and fail, and report folds them in while fresh', async () => {
  const dir = tmp();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'audit-fixture', private: true, scripts: { lint: 'node -e "console.log(\'lint ok\')"', build: 'node -e "console.error(\'boom\'); process.exit(2)"', start: 'node -e "process.exit(9)"' } }));
  const dry = await run(['audit', '--dry-run', '--json', '--cwd', dir]);
  assert.deepEqual(dry.json().planned, ['lint', 'build']);
  assert.ok(!existsSync(join(dir, '.craft')), 'dry run writes nothing');

  const a = await run(['audit', '--json', '--cwd', dir]);
  assert.equal(a.code, EXIT.FINDINGS);
  const checks = a.json().checks;
  assert.equal(checks.find((/** @type {any} */ c) => c.id === 't1.lint').status, 'verified');
  const build = checks.find((/** @type {any} */ c) => c.id === 't1.build');
  assert.equal(build.status, 'failed');
  assert.match(build.evidence, /exited 2.*boom/);

  const report = buildReport(dir);
  assert.ok(report.checks.some((/** @type {any} */ c) => c.id === 't1.build' && c.status === 'failed'));
  writeFileSync(join(dir, 'x.css'), '.x { color: var(--x, red); }');
  const later = buildReport(dir);
  assert.match(later.checks.find((/** @type {any} */ c) => c.id === 't1.audit').reason, /stale/);
});

test('audit without package.json is not verified, not failed', async () => {
  const r = await run(['audit', '--json', '--cwd', tmp()]);
  assert.equal(r.code, EXIT.OK);
  assert.equal(r.json().checks[0].status, 'not_verified');
});

test('audit honors tier1.commands from craft.config.json', async () => {
  const dir = tmp();
  await run(['init', '--cwd', dir]);
  const cfgPath = join(dir, '.craft', 'craft.config.json');
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  cfg.tier1 = { commands: { typecheck: 'node -e "process.exit(0)"' } };
  writeFileSync(cfgPath, JSON.stringify(cfg));
  const r = await run(['audit', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.OK, r.stdout);
  assert.deepEqual(r.json().checks.map((/** @type {any} */ c) => [c.id, c.status]), [['t1.typecheck', 'verified']]);
});
