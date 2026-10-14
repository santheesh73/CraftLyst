#!/usr/bin/env node
// Installs the packaged frontend-craft skill for agents other than Claude Code.
// Copies the package into <project>/.frontend-craft and adds a pointer the agent reads:
// a marked block in AGENTS.md (codex, generic) or .cursor/rules/frontend-craft.mdc (cursor).
// Never edits AGENTS.md outside its own markers and never overwrites without --force.
// No network, no process spawning. These adapters are untested in real agents (docs/compatibility.md).
import { existsSync, cpSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const AGENTS = ['codex', 'cursor', 'generic'];
export const SKILL_DIR = '.frontend-craft';
export const BEGIN = '<!-- frontend-craft:begin (managed by scripts/install-agent.js) -->';
export const END = '<!-- frontend-craft:end -->';

const USAGE = `Usage: install-agent --agent <${AGENTS.join('|')}> --project <dir> [--source <dir>] [--dry-run] [--force]

  --agent <name>    codex or generic: adds a marked block to <dir>/AGENTS.md
                    cursor: writes <dir>/.cursor/rules/frontend-craft.mdc
  --project <dir>   project to install into; the skill is copied to <dir>/${SKILL_DIR}
  --source <dir>    packaged skill directory (default: this package, or dist/frontend-craft in the repo)
  --dry-run         print what would change; change nothing
  --force           replace an existing ${SKILL_DIR} copy or Cursor rule
`;

/**
 * Pointer instructions shared by every agent. Kept short: the agent reads SKILL.md itself.
 * @param {string} description SKILL.md frontmatter description
 * @returns {string}
 */
export function pointerText(description) {
  return [
    '## Frontend Craft',
    '',
    `When to use: ${description}`,
    '',
    `Before any such task, read \`${SKILL_DIR}/SKILL.md\` and follow it. Wherever it says`,
    `\`<skill-dir>\`, use \`${SKILL_DIR}\`; run the CLI as \`node ${SKILL_DIR}/cli/bin/craft.js\`.`,
    'Read only the references SKILL.md points to for the task at hand, not the whole folder.'
  ].join('\n');
}

/**
 * Insert or replace the managed block, leaving everything outside the markers untouched.
 * @param {string} existing current AGENTS.md text ('' if none)
 * @param {string} body
 * @returns {string}
 */
export function upsertBlock(existing, body) {
  const block = `${BEGIN}\n${body}\n${END}\n`;
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  if (start !== -1 && end > start) return existing.slice(0, start) + block + existing.slice(end + END.length).replace(/^\n/, '');
  if (!existing) return block;
  return existing.replace(/\n*$/, '\n\n') + block;
}

/**
 * @param {string} description
 * @returns {string}
 */
export function cursorRule(description) {
  // Cursor project rules are .mdc files with description/globs/alwaysApply front matter.
  // An "agent requested" rule (description, no globs, alwaysApply false) lets Cursor decide when to load it.
  return ['---', `description: ${description.replace(/\n/g, ' ')}`, 'globs:', 'alwaysApply: false', '---', '', pointerText(description), ''].join('\n');
}

/**
 * @param {string} skillMd
 * @returns {string}
 */
export function readDescription(skillMd) {
  const m = /^---\n([\s\S]*?)\n---/.exec(skillMd);
  const line = m?.[1].split('\n').find((l) => l.startsWith('description:'));
  if (!line) throw new Error('SKILL.md has no description in its frontmatter.');
  return line.slice('description:'.length).trim();
}

/**
 * @param {string[]} argv
 * @param {{ log: (s: string) => void, error: (s: string) => void }} io
 * @returns {number} exit code (0 ok, 2 usage, 3 environment)
 */
export function installAgent(argv, io) {
  /** @type {any} */
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        agent: { type: 'string' },
        project: { type: 'string' },
        source: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false }
      }
    }));
  } catch (err) {
    io.error(`${/** @type {Error} */ (err).message}\n${USAGE}`);
    return 2;
  }
  if (values.help) {
    io.log(USAGE);
    return 0;
  }
  if (!AGENTS.includes(values.agent) || !values.project) {
    io.error(`Pass --agent (${AGENTS.join(', ')}) and --project <dir>.\n${USAGE}`);
    return 2;
  }
  const project = resolve(values.project);
  if (!existsSync(project)) {
    io.error(`Project directory ${project} does not exist.`);
    return 2;
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const packageRoot = resolve(here, '..');
  const defaultSource = existsSync(join(packageRoot, 'cli', 'package.json')) ? packageRoot : join(packageRoot, 'dist', 'frontend-craft');
  const source = resolve(values.source ?? defaultSource);
  if (!existsSync(join(source, 'SKILL.md')) || !existsSync(join(source, 'cli', 'package.json'))) {
    io.error(`No packaged skill at ${source}. In the repository, run "npm run package" first, or pass --source <dir>.`);
    return 3;
  }
  const description = readDescription(readFileSync(join(source, 'SKILL.md'), 'utf8'));

  const target = join(project, SKILL_DIR);
  if (existsSync(target) && !values.force) {
    io.error(`${target} already exists. Re-run with --force to replace it.`);
    return 3;
  }
  const rulePath = join(project, '.cursor', 'rules', 'frontend-craft.mdc');
  const agentsPath = join(project, 'AGENTS.md');
  if (values.agent === 'cursor' && existsSync(rulePath) && !values.force) {
    io.error(`${rulePath} already exists. Re-run with --force to replace it.`);
    return 3;
  }
  const pointer = values.agent === 'cursor' ? rulePath : agentsPath;
  const pointerAction = values.agent === 'cursor' ? 'write' : existsSync(agentsPath) ? 'update the frontend-craft block in' : 'create';

  if (values['dry-run']) {
    io.log(`Dry run: would copy the skill\n  from ${source}\n  to   ${target}${existsSync(target) ? ' (replacing it)' : ''}\nand ${pointerAction} ${pointer}`);
    return 0;
  }
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  if (values.agent === 'cursor') {
    mkdirSync(dirname(rulePath), { recursive: true });
    writeFileSync(rulePath, cursorRule(description));
  } else {
    writeFileSync(agentsPath, upsertBlock(existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : '', pointerText(description)));
  }
  io.log(`Installed frontend-craft for ${values.agent} to ${target}\nPointer: ${pointer}\nVerify: node ${join(target, 'cli', 'bin', 'craft.js')} --version\nThis adapter is untested in a live ${values.agent === 'generic' ? 'agent' : values.agent} session; see docs/compatibility.md.`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = installAgent(process.argv.slice(2), { log: (s) => console.log(s), error: (s) => console.error(s) });
}
