// Builds the package and tests it from clean temporary directories, never from the repo.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createZip, crc32 } from '../lib/zip.js';
import { validateSkill } from '../validate-skill.js';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const dist = join(repo, 'dist');

/** @param {string} cmd @param {string[]} args @param {string} [cwd] */
const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8' });

/** @param {string} dir @returns {string[]} */
const list = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? list(join(dir, n)).map((c) => `${n}/${c}`) : [n]));

before(() => {
  const r = sh(process.execPath, [join(repo, 'scripts', 'package.js')], repo);
  assert.equal(r.status, 0, r.stderr);
});

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('zip writer is deterministic and rejects unsafe paths', () => {
  const entries = [{ path: 'b.txt', data: Buffer.from('b') }, { path: 'a.txt', data: Buffer.from('a') }];
  assert.deepEqual(createZip(entries), createZip([...entries].reverse()));
  assert.throws(() => createZip([{ path: '../evil', data: Buffer.from('') }]), /Unsafe/);
});

test('package build is reproducible', () => {
  const zipName = readdirSync(dist).find((f) => f.endsWith('.zip'));
  assert.ok(zipName);
  const first = readFileSync(join(dist, zipName));
  const r = sh(process.execPath, [join(repo, 'scripts', 'package.js')], repo);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(first.equals(readFileSync(join(dist, zipName))), 'second build produced a different zip');
});

test('verify-package accepts the build', () => {
  const r = sh(process.execPath, [join(repo, 'scripts', 'verify-package.js')], repo);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('package contains the skill and no repo-only files', () => {
  const files = list(join(dist, 'frontend-craft'));
  for (const required of ['SKILL.md', 'LICENSE', 'LICENSE-docs', 'NOTICE.md', 'cli/bin/craft.js', 'cli/package.json', 'tokens/recipes.json', 'templates/DESIGN.md', 'cli/schemas/catalog-schema.json']) {
    assert.ok(files.includes(required), `missing ${required}`);
  }
  assert.equal(files.filter((f) => f.startsWith('references/')).length, 16);
  assert.deepEqual(files.filter((f) => /(^|\/)(test|fixtures|examples|evals|docs|node_modules)\//.test(f)), []);
});

test('extracted zip installs into a clean project and the CLI works there', () => {
  const zipName = /** @type {string} */ (readdirSync(dist).find((f) => f.endsWith('.zip')));
  const unpack = mkdtempSync(join(tmpdir(), 'craft-unpack-'));
  const u = sh('unzip', ['-q', join(dist, zipName), '-d', unpack]);
  assert.equal(u.status, 0, u.stderr);
  const pkgDir = join(unpack, 'frontend-craft');
  assert.deepEqual(validateSkill(pkgDir), [], 'SKILL.md must validate inside the package (links resolve)');

  const project = mkdtempSync(join(tmpdir(), 'craft-project-'));
  const installer = join(pkgDir, 'scripts', 'install-claude-code.js');
  const dry = sh(process.execPath, [installer, '--project', project, '--dry-run']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.ok(!existsSync(join(project, '.claude')), 'dry run must not write');

  const inst = sh(process.execPath, [installer, '--project', project]);
  assert.equal(inst.status, 0, inst.stderr);
  const skill = join(project, '.claude', 'skills', 'frontend-craft');
  assert.ok(existsSync(join(skill, 'SKILL.md')));
  assert.equal(sh(process.execPath, [installer, '--project', project]).status, 3, 'refuses to overwrite without --force');
  assert.equal(sh(process.execPath, [installer, '--project', project, '--force']).status, 0);

  const craft = join(skill, 'cli', 'bin', 'craft.js');
  const v = sh(process.execPath, [craft, '--version']);
  assert.equal(v.stdout.trim(), JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version);
  const app = join(project, 'app');
  mkdirSync(app);
  assert.equal(sh(process.execPath, [craft, 'init', '--cwd', app]).status, 0);
  assert.equal(sh(process.execPath, [craft, 'lint', '--cwd', app]).status, 0);
  assert.equal(sh(process.execPath, [craft, 'contrast', '--cwd', app]).status, 0);
  assert.equal(JSON.parse(sh(process.execPath, [craft, 'doctor', '--json', '--cwd', app]).stdout).environment.contract, true);
});

test('installer usage errors', () => {
  const installer = join(repo, 'scripts', 'install-claude-code.js');
  assert.equal(sh(process.execPath, [installer]).status, 2);
  assert.equal(sh(process.execPath, [installer, '--user', '--project', '/tmp']).status, 2);
  assert.equal(sh(process.execPath, [installer, '--project', '/does/not/exist']).status, 2);
  assert.equal(sh(process.execPath, [installer, '--project', tmpdir(), '--source', tmpdir()]).status, 3);
});
