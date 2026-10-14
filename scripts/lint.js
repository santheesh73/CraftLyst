#!/usr/bin/env node
// Repository lint (ADR-0008). Dependency-free checks for security policy,
// whitespace hygiene, and Markdown link integrity. Exit 1 on any problem.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.work']);
/** Fixture files are deliberately sloppy input for rules; only the security checks skip them too. */
const FIXTURE_PREFIX = `cli${sep}fixtures${sep}`;

/** Files allowed to spawn processes (with the reason recorded in SECURITY.md). */
const CHILD_PROCESS_ALLOW = new Set([
  'cli/src/doctor.js',
  'scripts/verify-package.js',
  'scripts/install-claude-code.js',
  'evals/triggers/run.js',
  'scripts/test/package.test.js'
]);
/** Files allowed to import network modules. None in v0.1. */
/** @type {Set<string>} */
const NETWORK_ALLOW = new Set([]);

/** @type {string[]} */
const problems = [];
/** @param {string} file @param {number} line @param {string} msg */
const report = (file, line, msg) => problems.push(`${file}:${line} ${msg}`);

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(root).map((p) => relative(root, p));
const textExt = new Set(['.js', '.json', '.md', '.yml', '.yaml', '.css', '.html', '.jsx', '.tsx', '.ts', '']);

for (const file of files) {
  const ext = extname(file);
  if (!textExt.has(ext) || file.startsWith('LICENSE')) continue;
  const text = readFileSync(join(root, file), 'utf8');
  const posix = file.split(sep).join('/');
  const isFixture = file.startsWith(FIXTURE_PREFIX);

  if (!isFixture) {
    if (text.length && !text.endsWith('\n')) report(posix, text.split('\n').length, 'missing final newline');
    text.split('\n').forEach((line, i) => {
      if (/[ \t]+$/.test(line)) report(posix, i + 1, 'trailing whitespace');
      if (ext === '.js' && line.includes('\t')) report(posix, i + 1, 'tab character in JS (use 2 spaces)');
    });
  }

  if (ext === '.js' && !isFixture && !posix.startsWith('scripts/lint.js')) {
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (/\beval\s*\(/.test(code)) report(posix, i + 1, 'eval() is forbidden (ADR-0007)');
      if (/\bnew\s+Function\s*\(/.test(code)) report(posix, i + 1, 'new Function() is forbidden (ADR-0007)');
      if (/from\s+['"]node:child_process['"]|require\(['"](node:)?child_process['"]\)/.test(code) && !CHILD_PROCESS_ALLOW.has(posix)) {
        report(posix, i + 1, 'child_process is only allowed in files listed in SECURITY.md and scripts/lint.js');
      }
      if (/from\s+['"](node:)?(http|https|net|dgram|tls|http2)['"]/.test(code) && !NETWORK_ALLOW.has(posix)) {
        report(posix, i + 1, 'network modules are not allowed (ADR-0007: no network without --allow-network)');
      }
    });
  }

  if (ext === '.md' && !isFixture) checkMarkdownLinks(posix, text);
}

/**
 * Relative links in Markdown must resolve to existing files.
 * @param {string} file
 * @param {string} text
 */
function checkMarkdownLinks(file, text) {
  const noCode = text.replace(/```[\s\S]*?```/g, (m) => '\n'.repeat(m.split('\n').length - 1)).replace(/`[^`\n]*`/g, '');
  noCode.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const path = target.split('#')[0];
      if (!path) continue;
      if (!existsSync(join(root, dirname(file), path))) report(file, i + 1, `broken link: ${target}`);
    }
  });
}

// SKILL.md: references one level deep, and long references need a table of contents.
if (existsSync(join(root, 'references'))) {
  for (const f of readdirSync(join(root, 'references')).filter((n) => n.endsWith('.md'))) {
    const text = readFileSync(join(root, 'references', f), 'utf8');
    const lines = text.split('\n');
    if (lines.length > 100 && !/^##\s+(Contents|Table of contents)\s*$/im.test(lines.slice(0, 40).join('\n'))) {
      report(`references/${f}`, 1, 'references longer than 100 lines need a "## Contents" section near the top');
    }
    for (const m of text.matchAll(/\]\((?!https?:|#)([^)]+\.md)(#[^)]*)?\)/g)) {
      if (!m[1].startsWith('../') && !m[1].includes('/')) {
        report(`references/${f}`, 1, `links to another reference (${m[1]}): keep references one level deep from SKILL.md`);
      }
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} lint problem(s).`);
  process.exit(1);
}
console.log(`lint: ${files.length} files checked, no problems.`);
