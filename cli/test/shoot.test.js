// Tier 2 tests drive real Chromium. They skip, with the reason, when Playwright's browser
// is not installed; CI installs it (ADR-0013) so they run there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main, EXIT } from '../src/cli.js';
import { isLoopback, resolveFrom } from '../src/shoot.js';

/** @param {string[]} args */
async function run(args) {
  let stdout = '';
  let stderr = '';
  const code = await main(args, { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } });
  return { code, stdout, stderr, json: () => JSON.parse(stdout) };
}
const tmp = () => mkdtempSync(join(tmpdir(), 'craft-shoot-'));

/** @returns {Promise<string | false>} skip reason or false */
async function browserMissing() {
  const pw = resolveFrom(process.cwd(), 'playwright');
  if (!pw) return 'playwright is not installed';
  try {
    const { chromium } = await import('playwright');
    const b = await chromium.launch();
    await b.close();
    return false;
  } catch (err) {
    return `Chromium is not installed: ${String(/** @type {Error} */ (err).message).split('\n')[0]}`;
  }
}
const skip = await browserMissing();

const CLEAN = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Clean</title>
<style>
  body { margin: 0; font: 16px/1.5 system-ui, sans-serif; color: #1f2328; background: #ffffff; }
  main { max-width: 40rem; padding: 1rem; }
  a, button { display: inline-block; min-height: 44px; min-width: 44px; padding: 10px 14px; }
  :focus-visible { outline: 3px solid #0b57d0; outline-offset: 2px; }
  @media (prefers-color-scheme: dark) { body { color: #e6edf3; background: #0d1117; } a { color: #79c0ff; } }
  @media (prefers-reduced-motion: no-preference) { .pulse { animation: pulse 2s infinite; } }
  @keyframes pulse { 50% { opacity: 0.6; } }
</style></head>
<body><main><h1>Reconcile a ledger</h1><p class="pulse">Import a CSV and match entries.</p>
<p><a href="#start">Start</a> <button type="button">Import</button></p></main></body></html>`;

test('remote URLs need --allow-network; bad input is a usage error', async () => {
  assert.equal(isLoopback('http://localhost:3000/'), true);
  assert.equal(isLoopback('http://127.0.0.1/'), true);
  assert.equal(isLoopback('http://[::1]:8080/'), true);
  assert.equal(isLoopback('https://example.com/'), false);
  assert.equal(isLoopback('http://localhost.example.com/'), false);
  const remote = await run(['shoot', '--url', 'https://example.com/', '--cwd', tmp()]);
  assert.equal(remote.code, EXIT.USAGE);
  assert.match(remote.stderr, /--allow-network/);
  assert.equal((await run(['shoot', '--cwd', tmp()])).code, EXIT.USAGE);
  assert.equal((await run(['shoot', '--file', 'nope.html', '--cwd', tmp()])).code, EXIT.USAGE);
  assert.equal((await run(['shoot', '--url', 'ftp://localhost/', '--cwd', tmp()])).code, EXIT.USAGE);
});

test('a clean page passes every automated Tier 2 check', { skip }, async () => {
  const dir = tmp();
  writeFileSync(join(dir, 'index.html'), CLEAN);
  const r = await run(['shoot', '--file', 'index.html', '--json', '--cwd', dir]);
  const out = r.json();
  assert.deepEqual(out.checks.filter((/** @type {any} */ c) => c.status === 'failed'), []);
  assert.deepEqual(out.findings.filter((/** @type {any} */ f) => f.severity !== 'info'), []);
  assert.equal(r.code, EXIT.OK);
  assert.equal(readdirSync(join(dir, '.craft', 'reports', 'shots')).length, 9);
  assert.ok(existsSync(join(dir, '.craft', 'reports', 'shoot.json')));
  const report = await run(['report', '--json', '--cwd', dir]);
  assert.equal(report.json().highestTier, 'T0', 'T1 was not run, so T2 cannot count');
});

test('a sloppy page fails overflow, axe, keyboard, and reduced motion; remote requests are blocked', { skip }, async () => {
  const dir = tmp();
  writeFileSync(join(dir, 'index.html'), `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>x</title>
<link rel="stylesheet" href="https://fonts.example.invalid/x.css">
<style>.wide{width:900px} button:focus{outline:none} .spin{animation:spin 2s linear infinite} @keyframes spin{to{transform:rotate(1turn)}} .low{color:#bbb;background:#fff}</style></head>
<body><main><h1>x</h1><p class="low">low</p><div class="wide">w</div><button>No ring</button><div class="spin">*</div><img src="a.png"></main></body></html>`);
  const r = await run(['shoot', '--file', 'index.html', '--json', '--cwd', dir]);
  assert.equal(r.code, EXIT.FINDINGS);
  const failed = r.json().checks.filter((/** @type {any} */ c) => c.status === 'failed').map((/** @type {any} */ c) => c.id.split(':')[0]);
  for (const id of ['t2.overflow', 't2.axe-light', 't2.keyboard', 't2.reduced-motion', 't2.zoom200']) assert.ok(failed.includes(id), `${id} should fail; failed: ${failed.join(', ')}`);
  const rules = new Set(r.json().findings.map((/** @type {any} */ f) => f.ruleId));
  for (const id of ['rsp/overflow', 'a11y/contrast', 'a11y/alt', 'a11y/focus', 'mot/no-reduced']) assert.ok(rules.has(id), `missing ${id}`);
  assert.deepEqual(r.json().blockedOrigins, ['https://fonts.example.invalid']);
});

test('loopback URLs render without --allow-network', { skip }, async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(CLEAN);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', () => done(undefined)));
  const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
  try {
    const r = await run(['shoot', '--url', `http://127.0.0.1:${addr.port}/`, '--json', '--cwd', tmp()]);
    assert.equal(r.code, EXIT.OK, r.stdout);
    assert.ok(r.json().checks.some((/** @type {any} */ c) => c.id === 't2.render:/' && c.status === 'verified'));
  } finally {
    server.close();
  }
});
