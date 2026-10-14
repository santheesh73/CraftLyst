#!/usr/bin/env node
// Finds *.test.js files and runs them with node:test. Node 20 does not expand
// globs passed to `node --test`, so we list the files explicitly.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const testDirs = ['cli/test', 'scripts/test', 'evals/test'];

/** @param {string} dir @returns {string[]} */
function find(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return find(p);
    return name.endsWith('.test.js') ? [p] : [];
  });
}

const files = testDirs.flatMap((d) => find(join(root, d))).sort();
if (!files.length) {
  console.error('No test files found in ' + testDirs.join(', '));
  process.exit(1);
}
console.log(`Running ${files.length} test file(s): ${files.map((f) => relative(root, f)).join(', ')}`);
const stream = run({ files, concurrency: true });
stream.on('test:fail', () => {
  process.exitCode = 1;
});
stream.compose(spec).pipe(process.stdout);
