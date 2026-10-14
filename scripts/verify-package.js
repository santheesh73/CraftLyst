#!/usr/bin/env node
// Verifies dist/: every SHA256SUMS line matches, the zip lists exactly the packaged files,
// and `unzip -t` accepts the archive. Spawns only `unzip` (allowlisted in scripts/lint.js).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
/** @type {string[]} */
const problems = [];
if (!existsSync(join(dist, 'SHA256SUMS'))) {
  console.error('dist/SHA256SUMS not found. Run "npm run package" first.');
  process.exit(3);
}
const lines = readFileSync(join(dist, 'SHA256SUMS'), 'utf8').trim().split('\n');
for (const line of lines) {
  const m = /^([a-f0-9]{64}) {2}(.+)$/.exec(line);
  if (!m) {
    problems.push(`malformed line: ${line}`);
    continue;
  }
  const p = join(dist, m[2]);
  if (!existsSync(p)) problems.push(`missing: ${m[2]}`);
  else if (createHash('sha256').update(readFileSync(p)).digest('hex') !== m[1]) problems.push(`checksum mismatch: ${m[2]}`);
}

/** @param {string} dir @returns {string[]} */
const list = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? list(join(dir, n)).map((c) => `${n}/${c}`) : [n]));
const packaged = list(join(dist, 'frontend-craft')).map((f) => `frontend-craft/${f}`).sort();
const summed = lines.map((l) => l.slice(66)).filter((f) => f.startsWith('frontend-craft/')).sort();
if (JSON.stringify(packaged) !== JSON.stringify(summed)) problems.push('SHA256SUMS does not list exactly the packaged files');

const zip = readdirSync(dist).find((f) => f.endsWith('.zip'));
if (!zip) problems.push('no zip archive in dist/');
else {
  const t = spawnSync('unzip', ['-t', join(dist, zip)], { encoding: 'utf8' });
  if (t.error) problems.push(`could not run unzip: ${t.error.message}`);
  else if (t.status !== 0) problems.push(`unzip -t failed:\n${t.stdout}${t.stderr}`);
  const l = spawnSync('unzip', ['-Z1', join(dist, zip)], { encoding: 'utf8' });
  if (!l.error && l.status === 0) {
    const inZip = l.stdout.trim().split('\n').sort();
    if (JSON.stringify(inZip) !== JSON.stringify(packaged)) problems.push('zip contents differ from dist/frontend-craft/');
  }
}

if (problems.length) {
  console.error(problems.map((p) => `FAIL ${p}`).join('\n'));
  process.exit(1);
}
console.log(`verify-package: ${lines.length} checksums ok, zip ${zip} tests ok and matches ${packaged.length} packaged files.`);
