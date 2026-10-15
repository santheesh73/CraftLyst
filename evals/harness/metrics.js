#!/usr/bin/env node
// Automated metrics for a harness run (P3). For each <pairId>/<arm> with a run.json:
//   1. Receipts: snapshot the agent's own .craft/reports/latest.json (if any) and check its
//      freshness with `craft report --check` before anything else touches the workspace.
//   2. Evaluation copy: copy the product files (no .craft/, .claude/, node_modules) to
//      <arm>/eval/, so both arms are measured the same way and the agent's own config cannot
//      change the measurement. node_modules is linked, not copied, when the workspace has one.
//   3. Slop Lint: `craft lint --json` on the copy. Inline craft-allow exceptions are counted
//      as findings for the gate (a suppressed finding is not an absent one).
//   4. Build/type: `craft audit --json` on the copy when it has a package.json, else n/a.
//   5. Rendered: `craft shoot --file <entry> --json` on the copy (axe violations, screenshots).
//   6. Honesty: heuristic claims-vs-receipts audit of the agent's final answer.
// Writes <arm>/metrics.json and <arm>/eval/. Spawns the repo CLI (node) only; no network.
//
// Usage: node evals/harness/metrics.js --run-id <id> [--pairs a,b] [--out <runs dir>] [--skip-shoot]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, symlinkSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { ARMS, NON_PRODUCT_DIRS, REPO, RUNS_DIR, auditClaims, copyTree, loadBriefs, parseClaims, readJson } from './lib.js';

const CRAFT = join(REPO, 'cli', 'bin', 'craft.js');

/**
 * Run the repo CLI and parse its --json output.
 * @param {string[]} args
 * @param {number} [timeoutMs]
 * @returns {{ code: number | null, json: any, stderr: string }}
 */
export function craft(args, timeoutMs = 900000) {
  const r = spawnSync(process.execPath, [CRAFT, ...args, '--json'], { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  /** @type {any} */
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    json = null;
  }
  return { code: r.status, json, stderr: (r.stderr ?? '').slice(0, 2000) };
}

/**
 * Measure one arm directory.
 * @param {string} armDir
 * @param {import('./lib.js').Brief} brief
 * @param {{ skipShoot?: boolean }} [opts]
 */
export function measureArm(armDir, brief, opts = {}) {
  const ws = join(armDir, 'workspace');
  const run = readJson(join(armDir, 'run.json'));
  const finalAnswer = existsSync(join(armDir, 'final.md')) ? readFileSync(join(armDir, 'final.md'), 'utf8') : '';

  // 1. Receipts, before anything else runs.
  const latestPath = join(ws, '.craft', 'reports', 'latest.json');
  /** @type {{ id: string, status: string, tier?: string }[]} */
  let receipts = [];
  /** @type {string} */
  let receiptState = 'missing';
  if (existsSync(latestPath)) {
    try {
      receipts = readJson(latestPath).checks ?? [];
      const check = craft(['report', '--check', '--cwd', ws]);
      receiptState = check.json?.status ?? 'unknown';
    } catch {
      receiptState = 'invalid';
    }
  }
  // Stale receipts no longer describe the delivered files, so they back no claim.
  const usable = receiptState === 'fresh' ? receipts : [];
  const claims = parseClaims(finalAnswer);
  const honesty = { heuristic: true, receiptState, receiptsVerified: receipts.filter((r) => r.status === 'verified').map((r) => r.id), ...auditClaims(claims, usable) };

  // 2. Evaluation copy.
  const evalDir = join(armDir, 'eval');
  rmSync(evalDir, { recursive: true, force: true });
  mkdirSync(evalDir, { recursive: true });
  const files = copyTree(ws, evalDir, NON_PRODUCT_DIRS);
  if (existsSync(join(ws, 'node_modules'))) symlinkSync(join(ws, 'node_modules'), join(evalDir, 'node_modules'), 'dir');

  // 3. Slop Lint.
  const lint = craft(['lint', '--cwd', evalDir]);
  // ctr/* rules check the skill's own .craft/ contract, which the copy deliberately lacks, so they
  // fire identically for both arms; they are recorded but left out of the total.
  /** @type {any[]} */
  const lintFindings = (lint.json?.findings ?? []).filter((/** @type {any} */ f) => !String(f.ruleId).startsWith('ctr/'));
  /** @type {any[]} */
  const lintExceptions = (lint.json?.exceptions ?? []).filter((/** @type {any} */ f) => !String(f.ruleId).startsWith('ctr/'));
  /** @param {string} sev */
  const sevCount = (sev) => lintFindings.filter((f) => f.severity === sev).length;
  const slop = lint.json
    ? { block: sevCount('block'), warn: sevCount('warn'), info: sevCount('info'), exceptions: lintExceptions.length, total: lintFindings.length + lintExceptions.length, excludedContractFindings: (lint.json.findings ?? []).length - lintFindings.length, byRule: countBy(lintFindings.map((f) => f.ruleId)) }
    : { error: lint.stderr || `exit ${lint.code}` };

  // 4. Build and type checks.
  /** @type {any} */
  let build = { applicable: false, reason: 'no package.json (plain HTML/CSS)' };
  if (existsSync(join(evalDir, 'package.json'))) {
    const a = craft(['audit', '--cwd', evalDir]);
    const checks = a.json?.checks ?? [];
    build = { applicable: true, checks: checks.map((/** @type {any} */ c) => ({ id: c.id, status: c.status })), failed: checks.filter((/** @type {any} */ c) => c.status === 'failed').length, verified: checks.filter((/** @type {any} */ c) => c.status === 'verified').length };
  }

  // 5. Rendered checks.
  /** @type {any} */
  let rendered = { ran: false, reason: opts.skipShoot ? 'skipped (--skip-shoot)' : `entry ${brief.entry} not found` };
  if (!opts.skipShoot && existsSync(join(evalDir, brief.entry))) {
    const s = craft(['shoot', '--file', brief.entry, '--cwd', evalDir]);
    if (s.json?.checks) {
      const axe = (s.json.findings ?? []).filter((/** @type {any} */ f) => /^axe /.test(f.message));
      rendered = {
        ran: true,
        axeViolations: axe.length,
        axeSerious: axe.filter((/** @type {any} */ f) => f.severity === 'block').length,
        axeRules: countBy(axe.map((/** @type {any} */ f) => String(f.message).split(':')[0].replace(/^axe /, ''))),
        failedChecks: s.json.checks.filter((/** @type {any} */ c) => c.status === 'failed').map((/** @type {any} */ c) => c.id),
        findings: s.json.summary,
        screenshots: s.json.screenshots ?? []
      };
    } else {
      rendered = { ran: false, reason: s.json?.message ?? s.stderr ?? `exit ${s.code}` };
    }
  }

  const metrics = {
    schemaVersion: '1.0', pairId: run.pairId, briefId: run.briefId, arm: run.arm, measuredAt: new Date().toISOString(),
    generation: { error: run.error, durationMs: run.durationMs, model: run.model, skillInvoked: run.skillInvoked },
    productFiles: files.length,
    slop, build, rendered, honesty
  };
  writeFileSync(join(armDir, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  return metrics;
}

/**
 * @param {string[]} xs
 * @returns {Record<string, number>}
 */
function countBy(xs) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const x of xs) out[x] = (out[x] ?? 0) + 1;
  return out;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const { values } = parseArgs({
    options: {
      'run-id': { type: 'string' },
      pairs: { type: 'string' },
      out: { type: 'string', default: RUNS_DIR },
      'skip-shoot': { type: 'boolean', default: false },
      'briefs-dir': { type: 'string' }
    }
  });
  if (!values['run-id']) {
    console.error('Usage: node evals/harness/metrics.js --run-id <id> [--pairs a,b] [--out <runs dir>] [--skip-shoot]');
    process.exit(2);
  }
  const runDir = join(resolve(String(values.out)), String(values['run-id']));
  if (!existsSync(runDir)) {
    console.error(`No run at ${runDir}`);
    process.exit(2);
  }
  const briefs = loadBriefs(values['briefs-dir'] ? resolve(values['briefs-dir']) : undefined);
  const wanted = values.pairs ? new Set(String(values.pairs).split(',')) : null;
  let n = 0;
  for (const pairId of readdirSync(runDir).sort()) {
    if (wanted && !wanted.has(pairId)) continue;
    const brief = briefs.find((b) => b.id === pairId.split('~')[0]);
    if (!brief) continue;
    for (const arm of ARMS) {
      const armDir = join(runDir, pairId, arm);
      if (!existsSync(join(armDir, 'run.json'))) continue;
      const m = measureArm(armDir, brief, { skipShoot: values['skip-shoot'] });
      n++;
      const s = /** @type {any} */ (m.slop);
      console.log(`${pairId} ${arm.padEnd(8)} slop=${s.total ?? 'error'} axe=${m.rendered.ran ? m.rendered.axeViolations : 'n/a'} build=${m.build.applicable ? `${m.build.failed} failed` : 'n/a'} honesty=${m.honesty.claims ? `${m.honesty.matched}/${m.honesty.claims}` : 'no claims'} (receipts ${m.honesty.receiptState})`);
    }
  }
  console.log(`\nMeasured ${n} generation(s). Next: node evals/harness/bundle.js --run-id ${values['run-id']}`);
}
