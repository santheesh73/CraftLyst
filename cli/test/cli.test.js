import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main, EXIT } from '../src/cli.js';
import { VERSION } from '../src/version.js';

/** @param {string[]} args */
async function run(args) {
  let stdout = '';
  let stderr = '';
  const code = await main(args, { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } });
  return { code, stdout, stderr, json: () => JSON.parse(stdout) };
}

const tmp = () => mkdtempSync(join(tmpdir(), 'craft-cli-'));

test('version matches package.json', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(VERSION, pkg.version);
  const r = await run(['--version', '--json']);
  assert.equal(r.code, EXIT.OK);
  assert.equal(r.json().version, VERSION);
});

test('usage errors exit 2', async () => {
  assert.equal((await run([])).code, EXIT.USAGE);
  assert.equal((await run(['nope'])).code, EXIT.USAGE);
  assert.equal((await run(['lint', '--fail-on', 'error'])).code, EXIT.USAGE);
  assert.equal((await run(['lint', '--unknown-flag'])).code, EXIT.USAGE);
  assert.equal((await run(['doctor', '--cwd', '/definitely/not/here'])).code, EXIT.USAGE);
  assert.equal((await run(['--help'])).code, EXIT.OK);
});

test('planned commands exit 3 and name their version', async () => {
  for (const cmd of ['audit', 'shoot', 'report', 'search', 'index', 'catalog', 'tokens']) {
    const r = await run([cmd, '--json']);
    assert.equal(r.code, EXIT.UNAVAILABLE, cmd);
    assert.equal(r.json().status, 'unavailable');
    assert.match(r.json().availableIn, /^\d+\.\d+\.\d+$/);
  }
  const fromRepo = await run(['init', '--from-repo', '--cwd', tmp()]);
  assert.equal(fromRepo.code, EXIT.UNAVAILABLE);
});

test('doctor detects a Next + Tailwind v4 project from files', async () => {
  const dir = tmp();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0', react: '19.0.0' }, devDependencies: { tailwindcss: '^4.0.0' }, scripts: { build: 'next build', lint: 'next lint', dev: 'next dev' } }));
  writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
  const env = (await run(['doctor', '--json', '--cwd', dir])).json().environment;
  assert.equal(env.framework, 'next');
  assert.equal(env.styling, 'tailwind-v4');
  assert.equal(env.packageManager, 'pnpm');
  assert.deepEqual(env.projectScripts, ['lint', 'build']);
  assert.equal(env.playwright, null);
  assert.equal(env.contract, false);
});

test('init creates the contract, never overwrites, and writes only inside .craft/', async () => {
  const dir = tmp();
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const r = await run(['init', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.OK);
  assert.deepEqual(r.json().created.sort(), ['.craft/.gitignore', '.craft/DESIGN.md', '.craft/craft.config.json', '.craft/decisions.md', '.craft/tokens.json']);
  assert.deepEqual(readdirSync(dir).sort(), ['.craft', 'index.html']);
  writeFileSync(join(dir, '.craft', 'DESIGN.md'), 'mine');
  const again = await run(['init', '--json', '--cwd', dir]);
  assert.equal(again.json().created.length, 0);
  assert.equal(readFileSync(join(dir, '.craft', 'DESIGN.md'), 'utf8'), 'mine');
});

test('lint: missing contract blocks; template warns; fail-on warn fails', async () => {
  const dir = tmp();
  const missing = await run(['lint', '--json', '--cwd', dir]);
  assert.equal(missing.code, EXIT.FINDINGS);
  assert.equal(missing.json().summary.block, 1);
  await run(['init', '--cwd', dir]);
  const template = await run(['lint', '--json', '--cwd', dir]);
  assert.equal(template.code, EXIT.OK);
  assert.deepEqual(template.json().rulesRun, ['ctr/contract']);
  assert.ok(template.json().summary.warn > 0);
  assert.equal((await run(['lint', '--fail-on', 'warn', '--cwd', dir])).code, EXIT.FINDINGS);
});

test('lint output is deterministic', async () => {
  const dir = tmp();
  await run(['init', '--cwd', dir]);
  const a = (await run(['lint', '--json', '--cwd', dir])).stdout;
  const b = (await run(['lint', '--json', '--cwd', dir])).stdout;
  assert.equal(a, b);
});

test('contrast passes the template and fails a bad pair', async () => {
  const dir = tmp();
  assert.equal((await run(['contrast', '--cwd', dir])).code, EXIT.UNAVAILABLE);
  await run(['init', '--cwd', dir]);
  const ok = await run(['contrast', '--json', '--cwd', dir]);
  assert.equal(ok.code, EXIT.OK);
  assert.equal(ok.json().counts.fail, 0);
  const tokensPath = join(dir, '.craft', 'tokens.json');
  const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
  tokens.primitive.color['neutral-600'] = '#bbbbbb';
  writeFileSync(tokensPath, JSON.stringify(tokens));
  const bad = await run(['contrast', '--json', '--cwd', dir]);
  assert.equal(bad.code, EXIT.FINDINGS);
  assert.ok(bad.json().results.some((/** @type {any} */ r) => r.status === 'fail' && r.pair.fg === 'color.text-muted'));
});

test('contrast rejects schema-invalid tokens', async () => {
  const dir = tmp();
  mkdirSync(join(dir, '.craft'));
  writeFileSync(join(dir, '.craft', 'tokens.json'), JSON.stringify({ schemaVersion: '1.0' }));
  const r = await run(['contrast', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.FINDINGS);
  assert.equal(r.json().status, 'invalid');
  assert.ok(!existsSync(join(dir, '.craft', 'reports')), 'contrast must not write files');
});
