#!/usr/bin/env node
// Builds the shipped catalog index catalog/index/index.json from catalog/entries (ADR-0014).
// --check: exit 1 if the committed index differs from a fresh build (CI). --out <file>: write
// elsewhere (scripts/package.js writes into dist/). Refuses to build while any entry is invalid.
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, validateCatalog, buildIndex, serializeIndex } from '../cli/src/catalog.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} [catalogRoot]
 * @returns {{ text: string, entryCount: number, errors: string[] }}
 */
export function buildShippedIndex(catalogRoot = join(root, 'catalog')) {
  const { errors, valid } = validateCatalog(loadCatalog({ catalogRoot }));
  return { text: serializeIndex(buildIndex(valid)), entryCount: valid.length, errors: errors.map((e) => `${e.file} [${e.rule}] ${e.message}`) };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const outIdx = args.indexOf('--out');
  const target = outIdx >= 0 ? resolve(args[outIdx + 1] ?? '') : join(root, 'catalog', 'index', 'index.json');
  const { text, entryCount, errors } = buildShippedIndex();
  if (errors.length) {
    console.error(`Catalog has ${errors.length} problem(s); fix them first (craft catalog validate):\n${errors.join('\n')}`);
    process.exit(1);
  }
  if (check) {
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (current !== text) {
      console.error(`${target} is out of date with catalog/entries. Run "node scripts/build-index.js" and commit the result.`);
      process.exit(1);
    }
    console.log(`catalog index is up to date (${entryCount} entries).`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    console.log(`Wrote ${target} (${entryCount} entries).`);
  }
}
