// Tier 1: run the project's own lint, typecheck, test, and build scripts and record the outcome.
// These are the user's scripts; craft runs them only when `craft audit` is invoked, never installs
// anything, and passes CI=1 so test runners do not start in watch mode.
import { spawnSync } from 'node:child_process';
import { detect } from './doctor.js';

/** @typedef {import('./report.js').Check} Check */

export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Last meaningful output lines, for evidence.
 * @param {string} text
 * @returns {string}
 */
function tail(text) {
  const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  return lines.slice(-5).join(' | ').slice(-400);
}

/**
 * @param {string} root
 * @param {{ scripts?: string[], timeoutMs?: number, dryRun?: boolean, ignore?: string[] }} [opts]
 * @returns {{ packageManager: string | null, planned: string[], checks: Check[], skipped: string | null }}
 */
export function audit(root, opts = {}) {
  const env = detect(root);
  const pm = env.packageManager;
  if (!env.packageJson || !pm) {
    return { packageManager: null, planned: [], checks: [{ id: 't1.scripts', tier: 'T1', status: 'not_verified', reason: 'No package.json: the project has no scripts for Tier 1.' }], skipped: 'no package.json' };
  }
  const available = env.projectScripts;
  const planned = opts.scripts?.length ? opts.scripts.filter((s) => available.includes(s)) : available.filter((s) => !(s === 'type-check' && available.includes('typecheck')));
  if (opts.dryRun) return { packageManager: pm, planned, checks: [], skipped: 'dry run' };
  if (!planned.length) {
    return { packageManager: pm, planned, checks: [{ id: 't1.scripts', tier: 'T1', status: 'not_verified', reason: `package.json has none of the Tier 1 scripts (lint, typecheck, test, build)${opts.scripts?.length ? ` matching ${opts.scripts.join(', ')}` : ''}.` }], skipped: 'no scripts' };
  }
  /** @type {Check[]} */
  const checks = [];
  for (const script of planned) {
    const started = Date.now();
    const r = spawnSync(pm, ['run', script], {
      cwd: root,
      encoding: 'utf8',
      timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === 'win32',
      env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }
    });
    const durationMs = Date.now() - started;
    const id = `t1.${script}`;
    const cmd = `${pm} run ${script}`;
    if (r.error && /ENOENT/.test(String(r.error))) {
      checks.push({ id, tier: 'T1', status: 'not_verified', reason: `${pm} is not on PATH.` });
    } else if (r.error || r.signal) {
      checks.push({ id, tier: 'T1', status: 'failed', evidence: `${cmd} did not finish: ${r.signal ? `killed by ${r.signal} (timeout ${Math.round((opts.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000)} s)` : String(r.error)}`, durationMs });
    } else if (r.status === 0) {
      checks.push({ id, tier: 'T1', status: 'verified', evidence: `${cmd} exited 0${tail(r.stdout) ? `: ${tail(r.stdout)}` : ''}`, durationMs });
    } else {
      checks.push({ id, tier: 'T1', status: 'failed', evidence: `${cmd} exited ${r.status}: ${tail(r.stderr + '\n' + r.stdout) || 'no output'}`, durationMs });
    }
  }
  return { packageManager: pm, planned, checks, skipped: null };
}
