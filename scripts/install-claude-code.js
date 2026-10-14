#!/usr/bin/env node
// Installs the packaged frontend-craft skill for Claude Code by copying it into
// ~/.claude/skills/frontend-craft (--user) or <dir>/.claude/skills/frontend-craft (--project).
// Never overwrites an existing install without --force. No network, no process spawning.
import { existsSync, cpSync, rmSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { parseArgs } from 'node:util';

const USAGE = `Usage: install-claude-code (--user | --project <dir>) [--source <dir>] [--dry-run] [--force] [--print-stop-hook]

  --user            install to ~/.claude/skills/frontend-craft
  --project <dir>   install to <dir>/.claude/skills/frontend-craft
  --source <dir>    packaged skill directory (default: this package, or dist/frontend-craft in the repo)
  --dry-run         print what would be copied; change nothing
  --force           replace an existing install
  --print-stop-hook print the settings.json entry for the opt-in Stop hook; change nothing
`;

/**
 * settings.json entry for the opt-in Stop hook. Per the Claude Code hooks reference, Stop takes no
 * matcher, and exec form (command + args) is used so the path placeholder needs no shell quoting.
 * @param {string} hookPath
 * @returns {string}
 */
export function stopHookSnippet(hookPath) {
  return JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node', args: [hookPath], timeout: 30 }] }] } }, null, 2);
}

/**
 * @param {string[]} argv
 * @param {{ log: (s: string) => void, error: (s: string) => void }} io
 * @returns {number} exit code (0 ok, 2 usage, 3 environment)
 */
export function install(argv, io) {
  /** @type {any} */
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        user: { type: 'boolean', default: false },
        project: { type: 'string' },
        source: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        'print-stop-hook': { type: 'boolean', default: false },
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
  if (Boolean(values.user) === Boolean(values.project)) {
    io.error(`Choose exactly one of --user or --project <dir>.\n${USAGE}`);
    return 2;
  }

  if (values['print-stop-hook']) {
    const hook = values.user
      ? join(homedir(), '.claude', 'skills', 'frontend-craft', 'adapters', 'claude-code', 'hooks', 'stop-proof.js')
      : '${CLAUDE_PROJECT_DIR}/.claude/skills/frontend-craft/adapters/claude-code/hooks/stop-proof.js';
    io.log(`Add this to ${values.user ? '~/.claude/settings.json' : '<project>/.claude/settings.json'} (merge with any existing "hooks"):\n${stopHookSnippet(hook)}`);
    return 0;
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const packageRoot = resolve(here, '..');
  const defaultSource = existsSync(join(packageRoot, 'cli', 'package.json')) ? packageRoot : join(packageRoot, 'dist', 'frontend-craft');
  const source = resolve(values.source ?? defaultSource);
  if (!existsSync(join(source, 'SKILL.md')) || !existsSync(join(source, 'cli', 'package.json'))) {
    io.error(`No packaged skill at ${source}. In the repository, run "npm run package" first, or pass --source <dir>.`);
    return 3;
  }

  const base = values.user ? join(homedir(), '.claude', 'skills') : join(resolve(values.project), '.claude', 'skills');
  const target = join(base, 'frontend-craft');
  if (values.project && !existsSync(resolve(values.project))) {
    io.error(`Project directory ${resolve(values.project)} does not exist.`);
    return 2;
  }
  if (existsSync(target) && !values.force) {
    io.error(`${target} already exists. Re-run with --force to replace it.`);
    return 3;
  }

  const files = countFiles(source);
  if (values['dry-run']) {
    io.log(`Dry run: would copy ${files} files\n  from ${source}\n  to   ${target}${existsSync(target) ? '\n  (replacing the existing install)' : ''}`);
    return 0;
  }
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  mkdirSync(base, { recursive: true });
  cpSync(source, target, { recursive: true });
  io.log(`Installed frontend-craft (${files} files) to ${target}\nVerify: node ${join(target, 'cli', 'bin', 'craft.js')} --version\nOptional proof gate (Stop hook): re-run with --print-stop-hook for the settings entry.`);
  return 0;
}

/**
 * @param {string} dir
 * @returns {number}
 */
function countFiles(dir) {
  return readdirSync(dir).reduce((n, name) => {
    const p = join(dir, name);
    return n + (statSync(p).isDirectory() ? countFiles(p) : 1);
  }, 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = install(process.argv.slice(2), { log: (s) => console.log(s), error: (s) => console.error(s) });
}
