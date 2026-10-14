// CI test (ADR-0007/0012): no craft command opens a network connection without --allow-network.
// Each command runs in a child Node process with scripts/test/no-network-guard.js preloaded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const guard = pathToFileURL(join(repo, 'scripts', 'test', 'no-network-guard.js')).href;
const craft = join(repo, 'cli', 'bin', 'craft.js');

/**
 * @param {string[]} args node arguments after the preload
 * @param {string} cwd
 */
function guarded(args, cwd) {
  const logFile = join(mkdtempSync(join(tmpdir(), 'craft-netlog-')), 'net.log');
  const r = spawnSync(process.execPath, ['--import', guard, ...args], { cwd, encoding: 'utf8', env: { ...process.env, CRAFT_NET_GUARD_LOG: logFile }, timeout: 120000 });
  const attempts = existsSync(logFile) ? readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean) : [];
  return { ...r, attempts };
}

test('the guard catches real connection attempts (control)', () => {
  const r = guarded(['-e', "fetch('http://example.com/').catch(() => {}); require('node:net').connect(80, '127.0.0.1').on('error', () => {});"], tmpdir());
  assert.ok(r.attempts.length >= 1, `guard recorded nothing: ${r.stderr}`);
});

test('no command opens a socket without --allow-network', async () => {
  const project = mkdtempSync(join(tmpdir(), 'craft-nonet-'));
  cpSync(join(repo, 'cli', 'fixtures', 'projects', 'sloppy-site'), project, { recursive: true });
  writeFileSync(join(project, 'page.html'), '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>x</title><link rel="stylesheet" href="https://fonts.example.invalid/a.css"><script src="https://cdn.example.invalid/a.js"></script></head><body><main><h1>x</h1><img src="https://images.example.invalid/a.png" alt="x"></main></body></html>');
  const commands = [
    ['--version'], ['--help'], ['doctor'], ['init', '--from-repo'], ['init'], ['lint'], ['lint', '--json'], ['contrast'],
    ['audit', '--dry-run'], ['report'], ['report', '--check'], ['search', 'x'], ['catalog', 'validate'], ['index', 'build'], ['search', 'table', '--json'], ['tokens']
  ];
  /** @type {string[]} */
  const problems = [];
  for (const c of commands) {
    const r = guarded([craft, ...c, '--cwd', project], project);
    if (r.attempts.length) problems.push(`craft ${c.join(' ')}: ${r.attempts.join('; ')}`);
    if (r.status === null) problems.push(`craft ${c.join(' ')} did not finish: ${r.error}`);
  }
  // Tier 2 on a local file: remote requests in the page are aborted by the request filter.
  let pw = false;
  try {
    const { chromium } = await import('playwright');
    await (await chromium.launch()).close();
    pw = true;
  } catch {
    pw = false;
  }
  if (pw) {
    const r = guarded([craft, 'shoot', '--file', 'page.html', '--json', '--cwd', project], project);
    if (r.attempts.length) problems.push(`craft shoot --file: ${r.attempts.join('; ')}`);
    const out = JSON.parse(r.stdout);
    assert.deepEqual(out.blockedOrigins, ['https://cdn.example.invalid', 'https://fonts.example.invalid', 'https://images.example.invalid']);
  } else {
    process.stdout.write('# shoot not covered: Chromium unavailable in this environment\n');
  }
  assert.deepEqual(problems, []);
});
