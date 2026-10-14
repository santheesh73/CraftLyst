import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateSkill, parseFrontmatter } from '../validate-skill.js';

const repo = new URL('../../', import.meta.url).pathname;

/** @param {(text: string) => string} edit */
function withSkill(edit) {
  const dir = mkdtempSync(join(tmpdir(), 'craft-skill-'));
  cpSync(join(repo, 'references'), join(dir, 'references'), { recursive: true });
  cpSync(join(repo, 'templates'), join(dir, 'templates'), { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), edit(readFileSync(join(repo, 'SKILL.md'), 'utf8')));
  return dir;
}

test('the repository SKILL.md is valid', () => {
  assert.deepEqual(validateSkill(repo), []);
});

test('frontmatter parsing', () => {
  const fm = parseFrontmatter('---\nname: x\ndescription: y\n---\nbody\n');
  assert.deepEqual(fm?.fields, { name: 'x', description: 'y' });
  assert.equal(parseFrontmatter('no frontmatter'), null);
});

test('rejects bad names, long or first-person descriptions, and long bodies', () => {
  assert.ok(validateSkill(withSkill((t) => t.replace('name: frontend-craft', 'name: Claude_Craft'))).some((p) => /lowercase|reserved|must be/.test(p)));
  assert.ok(validateSkill(withSkill((t) => t.replace(/^description: .*$/m, `description: ${'x'.repeat(1100)} Use when.`))).some((p) => /max 1024/.test(p)));
  assert.ok(validateSkill(withSkill((t) => t.replace(/^description: /m, 'description: I can help. Use when x. '))).some((p) => /third person/.test(p)));
  assert.ok(validateSkill(withSkill((t) => t + '\n'.repeat(400))).some((p) => /under 400/.test(p)));
});

test('rejects broken and unlinked references', () => {
  const problems = validateSkill(withSkill((t) => t.replace('(references/visual-qa.md)', '(references/nope.md)')));
  assert.ok(problems.some((p) => /broken link/.test(p)));
});
