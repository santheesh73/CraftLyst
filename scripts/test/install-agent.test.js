import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installAgent, upsertBlock, readDescription, BEGIN, END, SKILL_DIR } from '../install-agent.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'craft-agent-'));

/** A minimal stand-in for dist/frontend-craft. */
function fakePackage() {
  const dir = tmp();
  writeFileSync(join(dir, 'SKILL.md'), '---\nname: frontend-craft\ndescription: Guides frontend work. Use when building UI.\n---\n\n# Body\n');
  mkdirSync(join(dir, 'cli'));
  writeFileSync(join(dir, 'cli', 'package.json'), '{}\n');
  return dir;
}

/** @param {string[]} args */
function run(args) {
  /** @type {string[]} */
  const log = [];
  /** @type {string[]} */
  const err = [];
  const code = installAgent(args, { log: (s) => log.push(s), error: (s) => err.push(s) });
  return { code, log: log.join('\n'), err: err.join('\n') };
}

test('readDescription takes the frontmatter description', () => {
  assert.equal(readDescription('---\nname: x\ndescription: Does a thing.\n---\n'), 'Does a thing.');
  assert.throws(() => readDescription('# no frontmatter'));
});

test('upsertBlock keeps text outside the markers and replaces only its own block', () => {
  const first = upsertBlock('# Project rules\n\nUse pnpm.\n', 'v1');
  assert.ok(first.startsWith('# Project rules\n\nUse pnpm.\n\n' + BEGIN));
  const second = upsertBlock(first + '\nTrailing note.\n', 'v2');
  assert.ok(second.includes('v2') && !second.includes('v1'));
  assert.ok(second.includes('Use pnpm.') && second.includes('Trailing note.'));
  assert.equal(second.split(BEGIN).length, 2);
  assert.equal(upsertBlock('', 'x'), `${BEGIN}\nx\n${END}\n`);
});

test('codex install copies the skill and adds the AGENTS.md block once', () => {
  const src = fakePackage();
  const proj = tmp();
  writeFileSync(join(proj, 'AGENTS.md'), '# Existing\n');
  assert.equal(run(['--agent', 'codex', '--project', proj, '--source', src]).code, 0);
  assert.ok(existsSync(join(proj, SKILL_DIR, 'SKILL.md')));
  const agents = readFileSync(join(proj, 'AGENTS.md'), 'utf8');
  assert.ok(agents.startsWith('# Existing\n'));
  assert.match(agents, /Guides frontend work/);
  assert.match(agents, /node \.frontend-craft\/cli\/bin\/craft\.js/);
  // Second run without --force refuses; with --force it replaces, still one block.
  assert.equal(run(['--agent', 'codex', '--project', proj, '--source', src]).code, 3);
  assert.equal(run(['--agent', 'codex', '--project', proj, '--source', src, '--force']).code, 0);
  assert.equal(readFileSync(join(proj, 'AGENTS.md'), 'utf8').split(BEGIN).length, 2);
});

test('cursor install writes an agent-requested rule', () => {
  const src = fakePackage();
  const proj = tmp();
  assert.equal(run(['--agent', 'cursor', '--project', proj, '--source', src]).code, 0);
  const rule = readFileSync(join(proj, '.cursor', 'rules', 'frontend-craft.mdc'), 'utf8');
  assert.match(rule, /^---\ndescription: Guides frontend work\. Use when building UI\.\nglobs:\nalwaysApply: false\n---\n/);
  assert.ok(!existsSync(join(proj, 'AGENTS.md')));
});

test('dry run changes nothing; usage and missing source errors', () => {
  const src = fakePackage();
  const proj = tmp();
  const r = run(['--agent', 'generic', '--project', proj, '--source', src, '--dry-run']);
  assert.equal(r.code, 0);
  assert.match(r.log, /would copy/);
  assert.ok(!existsSync(join(proj, SKILL_DIR)) && !existsSync(join(proj, 'AGENTS.md')));
  assert.equal(run(['--agent', 'emacs', '--project', proj]).code, 2);
  assert.equal(run(['--agent', 'codex']).code, 2);
  assert.equal(run(['--agent', 'codex', '--project', join(proj, 'missing')]).code, 2);
  assert.equal(run(['--agent', 'codex', '--project', proj, '--source', tmp()]).code, 3);
});
