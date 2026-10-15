#!/usr/bin/env node
// Opt-in Claude Code Stop hook for Frontend Craft. When the project has a .craft/ contract
// and its proof report is missing, stale, or failing, it asks Claude to run `craft report`
// and state each check with its verified / not verified / failed label before stopping.
// It reads files only, never runs project code, and allows the stop on any internal error.
// Input and output follow the Claude Code hooks reference (Stop event, decision control).
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const craft = join(here, '..', '..', '..', 'cli', 'bin', 'craft.js');

/** @returns {Promise<string>} */
function readStdin() {
  return new Promise((done) => {
    let data = '';
    if (process.stdin.isTTY) return done('');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => done(data));
    process.stdin.on('error', () => done(data));
  });
}

/**
 * Decide whether to block. Exported for tests.
 * @param {{ stop_hook_active?: boolean, cwd?: string }} input
 * @param {string | undefined} projectDir CLAUDE_PROJECT_DIR
 * @returns {Promise<{ decision: 'block', reason: string } | null>}
 */
export async function decide(input, projectDir) {
  // Already continuing because of a Stop hook: never block twice in a row.
  if (input.stop_hook_active) return null;
  const root = input.cwd || projectDir || process.cwd();
  const contract = ['DESIGN.md', 'tokens.json', 'craft.config.json'].some((f) => existsSync(join(root, '.craft', f)));
  if (!contract) return null;
  const { checkReport } = await import('../../../cli/src/report.js');
  const c = checkReport(root);
  const run = `node "${craft}" report --cwd "${root}"`;
  const labels = 'Then report each check exactly as .craft/reports/latest.md labels it (✅ Verified, ⚠️ Not verified, ❌ Failed). If this turn did not change frontend code, say so and stop.';
  if (c.status === 'missing' || c.status === 'stale' || c.status === 'invalid') {
    if (c.status === 'stale' || c.status === 'invalid' || hasSources(root)) {
      return { decision: 'block', reason: `Frontend Craft: ${c.message.replace(/ Run craft report\.$/, "")} Run: ${run}. ${labels}` };
    }
    return null;
  }
  const failed = (c.report?.checks ?? []).filter((/** @type {any} */ x) => x.status === 'failed');
  if ((c.report?.summary?.block ?? 0) > 0 || failed.length) {
    return { decision: 'block', reason: `Frontend Craft: the proof report has ${c.report.summary.block} blocking finding(s) and ${failed.length} failed check(s) (${failed.map((/** @type {any} */ x) => x.id).slice(0, 5).join(', ')}). Fix them, add a reasoned craft-allow, or tell the user plainly what is still failing. See .craft/reports/latest.md.` };
  }
  return null;
}

/** @param {string} root */
function hasSources(root) {
  try {
    const pkg = existsSync(join(root, 'package.json')) ? readFileSync(join(root, 'package.json'), 'utf8') : '';
    return Boolean(pkg) || existsSync(join(root, 'index.html')) || existsSync(join(root, 'src'));
  } catch {
    return false;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const raw = await readStdin();
    const input = raw.trim() ? JSON.parse(raw) : {};
    const result = await decide(input, process.env.CLAUDE_PROJECT_DIR);
    if (result) process.stdout.write(JSON.stringify(result) + '\n');
  } catch (err) {
    // Never trap the user in a loop because the hook itself failed.
    process.stderr.write(`frontend-craft stop hook: ${/** @type {Error} */ (err).message}\n`);
  }
  process.exitCode = 0;
}
