#!/usr/bin/env node
// Validates SKILL.md against the Agent Skills constraints and our own packaging rules.
// Usage: node scripts/validate-skill.js [skill-dir]   (defaults to the repository root)
import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_BODY_LINES = 400;
export const REQUIRED_REFERENCES = [
  'design-intelligence', 'direction-engine', 'anti-slop-rules', 'design-critique', 'reference-analysis',
  'color-and-tokens', 'typography-and-spacing', 'layout-patterns', 'component-guidelines',
  'motion-and-interaction', 'responsive-design', 'accessibility', 'frontend-engineering', 'visual-qa',
  'framework-adapters', 'immersive-and-3d'
];

/**
 * Parse the simple `key: value` YAML frontmatter used by SKILL.md.
 * @param {string} text
 * @returns {{ fields: Record<string, string>, body: string } | null}
 */
export function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) return null;
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { fields, body: m[2] };
}

/**
 * @param {string} dir directory containing SKILL.md
 * @returns {string[]} problems
 */
export function validateSkill(dir) {
  /** @type {string[]} */
  const problems = [];
  const path = join(dir, 'SKILL.md');
  if (!existsSync(path)) return [`SKILL.md not found in ${dir}`];
  const text = readFileSync(path, 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm) return ['SKILL.md must start with YAML frontmatter delimited by --- lines'];
  const { name, description } = fm.fields;

  const allowed = new Set(['name', 'description']);
  for (const k of Object.keys(fm.fields)) if (!allowed.has(k)) problems.push(`unexpected frontmatter field "${k}"`);
  if (!name) problems.push('frontmatter "name" is required');
  else {
    if (name !== 'frontend-craft') problems.push(`name must be "frontend-craft", got "${name}"`);
    if (name.length > 64) problems.push('name exceeds 64 characters');
    if (!/^[a-z0-9-]+$/.test(name)) problems.push('name may contain only lowercase letters, numbers, and hyphens');
    if (/anthropic|claude/.test(name)) problems.push('name must not contain reserved words "anthropic" or "claude"');
  }
  if (!description) problems.push('frontmatter "description" is required');
  else {
    if (description.length > 1024) problems.push(`description is ${description.length} characters; max 1024`);
    if (/<[^>]+>/.test(description)) problems.push('description must not contain XML tags');
    if (/^(I|You|We)\b|\b(I can|you can|we can)\b/i.test(description)) problems.push('description must be written in the third person');
    if (!/\bUse when\b/.test(description)) problems.push('description must say when to use the skill ("Use when ...")');
  }

  const bodyLines = fm.body.replace(/\n$/, '').split('\n').length;
  if (bodyLines >= MAX_BODY_LINES) problems.push(`SKILL.md body has ${bodyLines} lines; must be under ${MAX_BODY_LINES}`);

  const linked = new Set();
  for (const m of fm.body.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^https?:/.test(target)) continue;
    if (!existsSync(join(dir, target))) problems.push(`broken link in SKILL.md: ${target}`);
    if (target.split('/').length > 2) problems.push(`link deeper than one level: ${target}`);
    const ref = /^references\/([a-z0-9-]+)\.md$/.exec(target);
    if (ref) linked.add(ref[1]);
  }
  for (const r of REQUIRED_REFERENCES) {
    if (!existsSync(join(dir, 'references', `${r}.md`))) problems.push(`missing reference references/${r}.md`);
    if (!linked.has(r)) problems.push(`references/${r}.md is not linked from SKILL.md`);
  }
  const refDir = join(dir, 'references');
  if (existsSync(refDir)) {
    for (const f of readdirSync(refDir)) {
      const lines = readFileSync(join(refDir, f), 'utf8').split('\n');
      if (lines.length > 100 && !lines.slice(0, 40).some((l) => /^## Contents\s*$/.test(l))) {
        problems.push(`references/${f} is over 100 lines and has no "## Contents" near the top`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const dir = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
  const problems = validateSkill(dir);
  const fm = parseFrontmatter(readFileSync(join(dir, 'SKILL.md'), 'utf8'));
  if (fm) {
    console.log(`SKILL.md: name=${fm.fields.name}, description ${fm.fields.description?.length ?? 0} chars, body ${fm.body.replace(/\n$/, '').split('\n').length} lines`);
  }
  if (problems.length) {
    console.error(problems.map((p) => `FAIL ${p}`).join('\n'));
    process.exit(1);
  }
  console.log('SKILL.md: ok');
}
