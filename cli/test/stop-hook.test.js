import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { decide } from '../../adapters/claude-code/hooks/stop-proof.js';
import { main } from '../src/cli.js';

const PROJECTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'projects');
const quiet = { stdout: () => {}, stderr: () => {} };
/** @param {string} name */
function copy(name) {
  const dir = mkdtempSync(join(tmpdir(), 'craft-hook-'));
  cpSync(join(PROJECTS, name), dir, { recursive: true });
  return dir;
}

test('no contract: the hook never blocks', async () => {
  assert.equal(await decide({ cwd: copy('sloppy-site') }, undefined), null);
});

test('missing then fresh then stale report', async () => {
  const dir = copy('clean-site');
  const missing = await decide({ cwd: dir }, undefined);
  assert.equal(missing?.decision, 'block');
  assert.match(missing?.reason ?? '', /craft\.js" report --cwd/);
  assert.match(missing?.reason ?? '', /✅ Verified, ⚠️ Not verified, ❌ Failed/);
  await main(['report', '--cwd', dir], quiet);
  assert.equal(await decide({ cwd: dir }, undefined), null, 'fresh and clean');
  writeFileSync(join(dir, 'styles.css'), '.x { color: var(--text); }\n');
  const stale = await decide({ cwd: dir }, undefined);
  assert.match(stale?.reason ?? '', /stale/);
});

test('stop_hook_active always allows the stop (no loops)', async () => {
  assert.equal(await decide({ cwd: copy('clean-site'), stop_hook_active: true }, undefined), null);
});

test('a fresh report with blocking findings blocks once with the reason', async () => {
  const dir = copy('clean-site');
  writeFileSync(join(dir, 'bad.html'), '<img src="x.png">');
  await main(['report', '--cwd', dir], quiet);
  const r = await decide({ cwd: '' }, dir);
  assert.equal(r?.decision, 'block');
  assert.match(r?.reason ?? '', /blocking finding/);
});
