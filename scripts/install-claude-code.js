#!/usr/bin/env node
// Installs the packaged frontend-craft skill for Claude Code into ~/.claude/skills/frontend-craft
// (--user) or <dir>/.claude/skills/frontend-craft (--project). A thin wrapper over the multi-agent
// installer: `node install.mjs install --agent claude-code`. Re-running is idempotent; a directory
// the installer did not create is never overwritten without --force. No network, no process spawning.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { main as installMain } from '../installer/main.js';
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

  if (values.project && !existsSync(resolve(values.project))) {
    io.error(`Project directory ${resolve(values.project)} does not exist.`);
    return 2;
  }
  // Thin wrapper over the multi-agent installer (installer/main.js).
  const args = ['install', '--agent', 'claude-code', ...(values.user ? ['--scope', 'user'] : ['--target', resolve(values.project)])];
  if (values.source) args.push('--source', values.source);
  if (values['dry-run']) args.push('--dry-run');
  if (values.force) args.push('--force');
  return installMain(args, { stdout: (s) => io.log(s.replace(/\n$/, '')), stderr: (s) => io.error(s.replace(/\n$/, '')) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = install(process.argv.slice(2), { log: (s) => console.log(s), error: (s) => console.error(s) });
}
