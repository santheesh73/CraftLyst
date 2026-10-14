#!/usr/bin/env node
// Builds the installable skill: dist/frontend-craft/, dist/frontend-craft-<version>.zip,
// and dist/SHA256SUMS. Writes only inside dist/. Output is reproducible (ADR-0009).
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync, chmodSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createZip } from './lib/zip.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dist = join(root, 'dist');
const out = join(dist, 'frontend-craft');

/** Files and directories copied into the package (repo path -> package path). */
const INCLUDE = [
  ['SKILL.md', 'SKILL.md'],
  ['LICENSE', 'LICENSE'],
  ['LICENSE-docs', 'LICENSE-docs'],
  ['NOTICE.md', 'NOTICE.md'],
  ['references', 'references'],
  ['templates', 'templates'],
  ['tokens/recipes.json', 'tokens/recipes.json'],
  ['cli/bin', 'cli/bin'],
  ['cli/src', 'cli/src'],
  ['cli/rules', 'cli/rules'],
  ['cli/schemas/tokens.schema.json', 'cli/schemas/tokens.schema.json'],
  ['cli/schemas/config.schema.json', 'cli/schemas/config.schema.json'],
  ['cli/schemas/report.schema.json', 'cli/schemas/report.schema.json'],
  ['cli/schemas/recipes.schema.json', 'cli/schemas/recipes.schema.json'],
  ['catalog/catalog-schema.json', 'cli/schemas/catalog-schema.json'],
  ['adapters/claude-code', 'adapters/claude-code'],
  ['scripts/install-claude-code.js', 'scripts/install-claude-code.js'],
  ['scripts/install-claude-code', 'scripts/install-claude-code'],
  ['scripts/validate-skill.js', 'scripts/validate-skill.js']
];
/**
 * Runtime packages vendored into cli/node_modules so the skill runs without npm install
 * (ADR-0005). @babel/types and its helpers are declared by @babel/parser but never loaded
 * by its bundle, so they are left out; the package test proves the CLI works without them.
 */
const VENDOR = ['@babel/parser', 'entities', 'nanoid', 'parse5', 'picocolors', 'postcss', 'source-map-js'];
/** Files inside vendored packages that are not needed at runtime. */
const VENDOR_SKIP = /\.(map|d\.ts|d\.mts|d\.cts|md)$|(^|\/)(bin)\//i;
const EXECUTABLE = new Set(['adapters/claude-code/hooks/stop-proof.js', 'cli/bin/craft.js', 'scripts/install-claude-code', 'scripts/install-claude-code.js']);

/**
 * @param {string} src
 * @param {string} dest
 */
function copy(src, dest) {
  if (statSync(src).isDirectory()) {
    for (const name of readdirSync(src).sort()) {
      if (name === 'README.md' && src.endsWith('templates')) continue;
      copy(join(src, name), join(dest, name));
    }
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

/**
 * @param {string} dir
 * @returns {string[]} posix paths relative to dir
 */
function list(dir) {
  return readdirSync(dir).sort().flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? list(p).map((c) => `${name}/${c}`) : [name];
  });
}

/** @param {Buffer} buf */
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

rmSync(dist, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [from, to] of INCLUDE) copy(join(root, from), join(out, to));

const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
/** @type {string[]} */
const thirdParty = [];
for (const name of VENDOR) {
  const entry = lock.packages[`node_modules/${name}`];
  if (!entry || entry.dev) throw new Error(`${name} is not a locked runtime dependency`);
  const src = join(root, 'node_modules', name);
  const meta = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'));
  if (meta.version !== entry.version) throw new Error(`${name}: installed ${meta.version}, locked ${entry.version}; run npm ci`);
  for (const f of list(src)) {
    if (VENDOR_SKIP.test(f) && !/^licen[cs]e/i.test(f.split('/').pop() ?? '')) continue;
    mkdirSync(dirname(join(out, 'cli', 'node_modules', name, f)), { recursive: true });
    copyFileSync(join(src, f), join(out, 'cli', 'node_modules', name, f));
  }
  thirdParty.push(`| ${name} | ${meta.version} | ${meta.license} | cli/node_modules/${name}/ |`);
}
writeFileSync(join(out, 'cli', 'THIRD-PARTY.md'), `# Third-party runtime packages

Vendored unmodified (build artifacts only; source maps, type declarations, and docs removed).
Each package's license file is kept in its directory.

| Package | Version | License | Location |
|---|---|---|---|
${thirdParty.join('\n')}
`);

writeFileSync(join(out, 'cli', 'package.json'), JSON.stringify({
  name: 'frontend-craft-cli',
  version: pkg.version,
  private: true,
  license: 'Apache-2.0',
  type: 'module',
  engines: { node: '>=20.19' },
  dependencies: Object.fromEntries(VENDOR.filter((n) => pkg.dependencies[n]).map((n) => [n, pkg.dependencies[n]])),
  bin: { craft: 'bin/craft.js' }
}, null, 2) + '\n');

writeFileSync(join(out, 'README.md'), `# frontend-craft ${pkg.version}

Installable Agent Skill. Install for Claude Code:

    node scripts/install-claude-code.js --user              # ~/.claude/skills/frontend-craft
    node scripts/install-claude-code.js --project <dir>     # <dir>/.claude/skills/frontend-craft
    node scripts/install-claude-code.js --user --dry-run    # show what would be copied

CLI (Node 20+): node cli/bin/craft.js --help

Code: Apache-2.0 (LICENSE). Docs and references: CC-BY-4.0 (LICENSE-docs).
`);

const files = list(out);
for (const f of files) if (EXECUTABLE.has(f)) chmodSync(join(out, f), 0o755);

const zipName = `frontend-craft-${pkg.version}.zip`;
const zip = createZip(files.map((f) => ({ path: `frontend-craft/${f}`, data: readFileSync(join(out, f)), executable: EXECUTABLE.has(f) })));
writeFileSync(join(dist, zipName), zip);

const sums = [
  `${sha256(zip)}  ${zipName}`,
  ...files.map((f) => `${sha256(readFileSync(join(out, f)))}  frontend-craft/${f}`)
];
writeFileSync(join(dist, 'SHA256SUMS'), sums.join('\n') + '\n');

const size = files.reduce((n, f) => n + statSync(join(out, f)).size, 0);
console.log(`Packaged ${files.length} files (${(size / 1024).toFixed(1)} KiB) into ${relative(root, out).split(sep).join('/')}/`);
console.log(`Archive: dist/${zipName} (${(zip.length / 1024).toFixed(1)} KiB), sha256 ${sha256(zip)}`);
console.log('Checksums: dist/SHA256SUMS');
