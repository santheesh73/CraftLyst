// End-to-end installer tests against the packaged build (P1b regression guards 1, 2, 3, 6):
// the package is built into a temp directory, installed into clean projects, and the installed
// CLI is run there. Runs on Linux, macOS, and Windows in CI (no unzip or shell needed).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const build = mkdtempSync(join(tmpdir(), 'fc-e2e-build-'));
const pkg = join(build, 'frontend-craft');
const tmp = (p = 'fc-e2e-') => mkdtempSync(join(tmpdir(), p));
/** @param {string[]} args @param {string} [cwd] */
const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

/** npm, run through Node when npm tells us where its CLI is (works the same on Windows). @param {string[]} args @param {string} cwd */
function npm(args, cwd) {
  const cli = process.env.npm_execpath;
  if (cli && /\.(c?js)$/.test(cli)) return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
  return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
}

/** A small page that passes every static rule. */
const CLEAN_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plain page</title>
</head>
<body>
  <main>
    <h1>Opening hours</h1>
    <p>We are open from nine to five on weekdays.</p>
  </main>
</body>
</html>
`;

before(() => {
  const r = node([join(repo, 'scripts', 'package.js'), '--out', build], repo);
  assert.equal(r.status, 0, r.stderr);
});

test('packaged installer installs every agent into a clean project and the installed CLI runs', () => {
  const project = tmp();
  const r = node([join(pkg, 'install.mjs'), 'install', '--agent', 'all', '--target', project, '--json']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const results = JSON.parse(r.stdout).results;
  assert.ok(results.every((/** @type {any} */ x) => x.action === 'create' || x.action === 'n/a'), r.stdout);
  const v = node([join(pkg, 'install.mjs'), 'verify', '--target', project, '--json']);
  assert.equal(v.status, 0, v.stdout);
  assert.ok(JSON.parse(v.stdout).agents.every((/** @type {any} */ a) => a.level === 'V1'));
  const again = node([join(pkg, 'install.mjs'), 'install', '--agent', 'all', '--target', project, '--json']);
  assert.ok(JSON.parse(again.stdout).results.every((/** @type {any} */ x) => x.action === 'unchanged' || x.action === 'n/a'), 'second run changes nothing');
});

test('no self-scanning: with every agent installed, the installed CLI lints exactly the one page', () => {
  const project = tmp();
  writeFileSync(join(project, 'index.html'), CLEAN_PAGE);
  assert.equal(node([join(pkg, 'install.mjs'), 'install', '--agent', 'all', '--target', project]).status, 0);
  for (const cli of [join(project, '.frontend-craft', 'cli', 'bin', 'craft.js'), join(project, '.claude', 'skills', 'frontend-craft', 'cli', 'bin', 'craft.js')]) {
    if (!existsSync(cli)) continue;
    const r = node([cli, 'lint', '--json', '--cwd', project]);
    const out = JSON.parse(r.stdout);
    assert.equal(out.files, 1, `scanned ${out.files} files: the installed skill or agent config was linted`);
    // Informational findings (for example "no design contract yet") are not defects.
    assert.deepEqual(out.findings.filter((/** @type {any} */ f) => f.severity !== 'info'), []);
  }
});

test('Claude Code wrapper from the package still installs, idempotently', () => {
  const project = tmp();
  const w = join(pkg, 'scripts', 'install-claude-code.js');
  assert.equal(node([w, '--project', project]).status, 0);
  assert.ok(existsSync(join(project, '.claude', 'skills', 'frontend-craft', 'SKILL.md')));
  const again = node([w, '--project', project]);
  assert.equal(again.status, 0);
  assert.match(again.stdout, /unchanged/);
  assert.match(node([w, '--project', project, '--print-stop-hook']).stdout, /stop-proof\.js/);
});

test('the npm tarball installs offline in a clean directory and `frontend-craft install` works from it', () => {
  const packDir = tmp('fc-pack-');
  const p = npm(['pack', '--pack-destination', packDir, '--json'], pkg);
  assert.equal(p.status, 0, p.stderr);
  const info = JSON.parse(p.stdout)[0];
  assert.deepEqual([...info.bundled].sort(), ['@babel/parser', 'entities', 'nanoid', 'parse5', 'picocolors', 'postcss', 'source-map-js']);
  const tarball = join(packDir, info.filename);
  const consumer = tmp('fc-consumer-');
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }) + '\n');
  const i = npm(['install', '--offline', '--no-audit', '--no-fund', '--ignore-scripts', tarball], consumer);
  assert.equal(i.status, 0, i.stderr);
  const installed = join(consumer, 'node_modules', 'frontend-craft');
  assert.ok(existsSync(join(installed, 'node_modules', 'postcss')), 'bundled parsers are installed with the package');
  const app = join(consumer, 'app');
  mkdirSync(app);
  writeFileSync(join(app, 'index.html'), CLEAN_PAGE);
  const r = node([join(installed, 'install.mjs'), 'install', '--agent', 'claude-code,agents-md', '--target', app]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const lint = node([join(app, '.frontend-craft', 'cli', 'bin', 'craft.js'), 'lint', '--json', '--cwd', app]);
  assert.equal(JSON.parse(lint.stdout).files, 1);
  assert.equal(node([join(installed, 'install.mjs'), 'uninstall', '--target', app]).status, 0);
  assert.deepEqual(readdirSync(app), ['index.html']);
  assert.equal(JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8')).scripts, undefined);
});
