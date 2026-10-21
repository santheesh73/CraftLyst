#!/usr/bin/env node
// Builds the outside-tester kit: dist/tester-kit/ with the release zip, its checksum, the
// tester guide, and the feedback form. Send the folder (or a zip of it) to each tester.
// Writes only inside dist/. Usage: node scripts/tester-kit.js [--no-build]
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const zip = `frontend-craft-${version}.zip`;
const dist = join(root, 'dist');

if (!process.argv.includes('--no-build')) {
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'package.js')], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
if (!existsSync(join(dist, zip))) {
  console.error(`dist/${zip} not found. Run without --no-build, or npm run package first.`);
  process.exit(3);
}
const out = join(dist, 'tester-kit');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copyFileSync(join(dist, zip), join(out, zip));
const sum = readFileSync(join(dist, 'SHA256SUMS'), 'utf8').split('\n').find((l) => l.endsWith(`  ${zip}`));
writeFileSync(join(out, 'SHA256SUMS'), `${sum}\n`);
for (const f of ['TESTER-GUIDE.md', 'FEEDBACK.md']) copyFileSync(join(root, 'docs', 'human-gates', 'tester-kit', f), join(out, f));
console.log(`Wrote dist/tester-kit/: ${zip}, SHA256SUMS, TESTER-GUIDE.md, FEEDBACK.md.`);
console.log('Send the folder to each tester; they start with TESTER-GUIDE.md and return FEEDBACK.md.');
