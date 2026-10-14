// Proof report: .craft/reports/latest.json (schema: report.schema.json) and latest.md.
// The report is a receipt: only checks recorded here as verified may be claimed as verified,
// and the content hash makes it stale as soon as a covered file changes.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { VERSION } from './version.js';
import { detect } from './doctor.js';
import { contentHash } from './hash.js';
import { runLint, loadConfig } from './lint.js';
import { checkPairs } from './tokens.js';
import { validateAgainst } from './schemas.js';

/**
 * @typedef {{ id: string, tier: 'T0' | 'T1' | 'T2' | 'T3', status: 'verified', evidence: string, durationMs?: number }
 *   | { id: string, tier: 'T0' | 'T1' | 'T2' | 'T3', status: 'failed', evidence: string, durationMs?: number }
 *   | { id: string, tier: 'T0' | 'T1' | 'T2' | 'T3', status: 'not_verified', reason: string }} Check
 * @typedef {{ contentHash: string, finishedAt: string, checks: Check[], findings: import('./lint.js').Finding[] }} TierResult
 */

export const TIERS = /** @type {const} */ (['T0', 'T1', 'T2', 'T3']);
const reportsDir = (/** @type {string} */ root) => join(root, '.craft', 'reports');

/**
 * Persist a tier result so `craft report` can include it while the covered files are unchanged.
 * @param {string} root
 * @param {'audit' | 'shoot'} name
 * @param {{ checks: Check[], findings?: import('./lint.js').Finding[] }} result
 */
export function saveTierResult(root, name, result) {
  const config = loadConfig(root);
  mkdirSync(reportsDir(root), { recursive: true });
  /** @type {TierResult} */
  const data = { contentHash: contentHash(root, { ignore: config.ignore ?? [] }).value, finishedAt: new Date().toISOString(), checks: result.checks, findings: result.findings ?? [] };
  writeFileSync(join(reportsDir(root), `${name}.json`), JSON.stringify(data, null, 2) + '\n');
}

/**
 * @param {string} root
 * @param {'audit' | 'shoot'} name
 * @param {string} hash current content hash
 * @returns {{ state: 'missing' | 'stale' | 'fresh', result?: TierResult }}
 */
function loadTierResult(root, name, hash) {
  const p = join(reportsDir(root), `${name}.json`);
  if (!existsSync(p)) return { state: 'missing' };
  try {
    /** @type {TierResult} */
    const r = JSON.parse(readFileSync(p, 'utf8'));
    return r.contentHash === hash ? { state: 'fresh', result: r } : { state: 'stale', result: r };
  } catch {
    return { state: 'missing' };
  }
}

/**
 * Highest tier reached: every tier up to it has at least one verified check and no failed check.
 * @param {Check[]} checks
 * @returns {'none' | 'T0' | 'T1' | 'T2' | 'T3'}
 */
export function highestTier(checks) {
  /** @type {'none' | 'T0' | 'T1' | 'T2' | 'T3'} */
  let best = 'none';
  for (const tier of TIERS) {
    const own = checks.filter((c) => c.tier === tier);
    if (!own.some((c) => c.status === 'verified') || own.some((c) => c.status === 'failed')) break;
    best = tier;
  }
  return best;
}

/**
 * Run Tier 0 now, fold in fresh Tier 1/2 results, and return a schema-valid report.
 * @param {string} root
 * @returns {any}
 */
export function buildReport(root) {
  const startedAt = new Date().toISOString();
  const config = loadConfig(root);
  const hash = contentHash(root, { ignore: config.ignore ?? [] });
  const env = detect(root);
  const lint = runLint(root);

  /** @type {Check[]} */
  const checks = [];
  checks.push(lint.summary.block === 0
    ? { id: 't0.slop-lint', tier: 'T0', status: 'verified', evidence: `craft lint: ${lint.files.length} files, ${lint.rulesRun.length} rules, ${lint.summary.block} block, ${lint.summary.warn} warn, ${lint.summary.info} info`, durationMs: lint.durationMs }
    : { id: 't0.slop-lint', tier: 'T0', status: 'failed', evidence: `craft lint: ${lint.summary.block} blocking finding(s) in ${lint.files.length} files (first: ${lint.findings.find((f) => f.severity === 'block')?.ruleId} ${lint.findings.find((f) => f.severity === 'block')?.file})`, durationMs: lint.durationMs });

  const contract = lint.findings.filter((f) => f.ruleId === 'ctr/contract');
  if (contract.some((f) => f.file === '.craft/')) checks.push({ id: 't0.contract', tier: 'T0', status: 'not_verified', reason: 'No .craft/ design contract in this project.' });
  else if (contract.some((f) => f.severity === 'block')) checks.push({ id: 't0.contract', tier: 'T0', status: 'failed', evidence: contract.filter((f) => f.severity === 'block').map((f) => f.message).join('; ').slice(0, 400) });
  else checks.push({ id: 't0.contract', tier: 'T0', status: 'verified', evidence: `.craft/ contract is structurally valid${contract.length ? ` (${contract.length} warning(s))` : ''}` });

  const tokensPath = join(root, '.craft', 'tokens.json');
  /** @type {any} */
  let tokens = null;
  try {
    tokens = existsSync(tokensPath) ? JSON.parse(readFileSync(tokensPath, 'utf8')) : null;
  } catch {
    tokens = null;
  }
  if (!tokens || !validateAgainst('tokens', tokens).valid) checks.push({ id: 't0.contrast', tier: 'T0', status: 'not_verified', reason: tokens ? '.craft/tokens.json does not match the schema.' : 'No valid .craft/tokens.json.' });
  else {
    const results = checkPairs(tokens);
    const fail = results.filter((r) => r.status === 'fail');
    const unresolved = results.filter((r) => r.status === 'unresolved');
    if (!results.length) checks.push({ id: 't0.contrast', tier: 'T0', status: 'not_verified', reason: 'tokens.json declares no foreground/background pairs.' });
    else if (fail.length) checks.push({ id: 't0.contrast', tier: 'T0', status: 'failed', evidence: `${fail.length} of ${results.length} token pairs below WCAG AA (first: ${fail[0].pair.fg} on ${fail[0].pair.bg}, ${fail[0].theme}, ${fail[0].ratio}:1)` });
    else checks.push({ id: 't0.contrast', tier: 'T0', status: 'verified', evidence: `${results.length - unresolved.length} token pairs pass WCAG AA${unresolved.length ? `; ${unresolved.length} unresolved` : ''}` });
  }

  /** @type {import('./lint.js').Finding[]} */
  const findings = [...lint.findings];
  for (const [name, tier, cmd] of /** @type {const} */ ([['audit', 'T1', 'craft audit'], ['shoot', 'T2', 'craft shoot']])) {
    const t = loadTierResult(root, name, hash.value);
    if (t.state === 'fresh' && t.result) {
      checks.push(...t.result.checks);
      findings.push(...(t.result.findings ?? []));
    } else {
      checks.push({ id: `${tier.toLowerCase()}.${name}`, tier, status: 'not_verified', reason: t.state === 'stale' ? `${cmd} results are stale: files changed after it ran at ${t.result?.finishedAt}. Run ${cmd} again.` : `${cmd} has not been run on this version of the files.` });
    }
  }
  const hasShoot = checks.some((c) => c.tier === 'T2' && c.status !== 'not_verified');
  if (!hasShoot) for (const id of lint.rulesRenderedOnly) checks.push({ id: `t2.${id}`, tier: 'T2', status: 'not_verified', reason: `${id} needs a rendered page (craft shoot).` });
  checks.push({ id: 't3.review', tier: 'T3', status: 'not_verified', reason: 'Tier 3 (human or side-by-side visual review) is not run by the CLI.' });

  const summary = { block: 0, warn: 0, info: 0 };
  for (const f of findings) summary[f.severity]++;
  const tiersAttempted = TIERS.filter((t) => checks.some((c) => c.tier === t && c.status !== 'not_verified'));
  /** @type {any} */
  const project = { contentHash: { algorithm: 'sha256', value: hash.value, fileCount: hash.fileCount } };
  const name = readPackageName(root);
  if (name) project.name = name;
  const report = {
    schemaVersion: '1.0',
    runId: `${startedAt.replace(/[-:TZ.]/g, '').slice(0, 14)}-${randomBytes(3).toString('hex')}`,
    tool: { name: 'frontend-craft', version: VERSION },
    startedAt,
    finishedAt: new Date().toISOString(),
    project,
    tooling: { node: env.node, packageManager: env.packageManager, framework: env.framework, styling: env.styling, playwright: env.playwright, axe: env.axe, projectScripts: env.projectScripts },
    tiersAttempted,
    highestTier: highestTier(checks),
    checks,
    findings,
    exceptions: lint.exceptions,
    summary
  };
  return report;
}

/** @param {string} root */
function readPackageName(root) {
  try {
    const n = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name;
    return typeof n === 'string' && n ? n : basename(root);
  } catch {
    return basename(root);
  }
}

const LABEL = { verified: '✅ Verified', not_verified: '⚠️ Not verified', failed: '❌ Failed' };

/**
 * @param {any} report
 * @returns {string}
 */
export function renderMarkdown(report) {
  /** @param {string} s */
  const cell = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines = [
    `# Frontend Craft proof report`,
    '',
    `- Project: ${report.project.name ?? 'unnamed'} (${report.project.contentHash.fileCount} files, sha256 ${report.project.contentHash.value.slice(0, 12)})`,
    `- Run: ${report.runId}, ${report.finishedAt}, frontend-craft ${report.tool.version}, Node ${report.tooling.node}`,
    `- Highest tier reached: **${report.highestTier}**`,
    `- Findings: ${report.summary.block} block, ${report.summary.warn} warn, ${report.summary.info} info; ${report.exceptions.length} reasoned exception(s)`,
    '',
    'This report goes stale when any covered file changes; `craft report --check` says whether it still matches.',
    'Only checks marked Verified below may be claimed as verified.',
    '',
    '## Checks',
    '',
    '| Check | Tier | Result | Evidence or reason |',
    '|---|---|---|---|',
    ...report.checks.map((/** @type {Check} */ c) => `| ${c.id} | ${c.tier} | ${LABEL[c.status]} | ${cell(c.status === 'not_verified' ? c.reason : c.evidence)} |`),
    ''
  ];
  for (const sev of ['block', 'warn', 'info']) {
    const fs = report.findings.filter((/** @type {any} */ f) => f.severity === sev);
    if (!fs.length) continue;
    lines.push(`## ${sev[0].toUpperCase()}${sev.slice(1)} findings (${fs.length})`, '');
    for (const f of fs.slice(0, 50)) lines.push(`- \`${f.ruleId}\` ${f.file}${f.line ? `:${f.line}` : ''}: ${f.message} Fix: ${f.remediation}`);
    if (fs.length > 50) lines.push(`- ...and ${fs.length - 50} more in latest.json`);
    lines.push('');
  }
  if (report.exceptions.length) {
    lines.push('## Reasoned exceptions', '');
    for (const e of report.exceptions) lines.push(`- \`${e.ruleId}\` ${e.file}${e.line ? `:${e.line}` : ''} (${e.source}): ${e.reason}`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Write latest.json and latest.md under .craft/reports/.
 * @param {string} root
 * @param {any} report
 */
export function writeReport(root, report) {
  mkdirSync(reportsDir(root), { recursive: true });
  writeFileSync(join(reportsDir(root), 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(join(reportsDir(root), 'latest.md'), renderMarkdown(report));
}

/**
 * Is .craft/reports/latest.json present, valid, and still matching the files?
 * @param {string} root
 * @returns {{ status: 'fresh' | 'stale' | 'missing' | 'invalid', message: string, report?: any }}
 */
export function checkReport(root) {
  const p = join(reportsDir(root), 'latest.json');
  if (!existsSync(p)) return { status: 'missing', message: 'No .craft/reports/latest.json. Run craft report.' };
  /** @type {any} */
  let report;
  try {
    report = JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    return { status: 'invalid', message: `latest.json is not valid JSON: ${/** @type {Error} */ (err).message}` };
  }
  const v = validateAgainst('report', report);
  if (!v.valid) return { status: 'invalid', message: `latest.json does not match the report schema: ${v.errors.slice(0, 3).map((e) => `${e.path} ${e.message}`).join('; ')}` };
  const config = loadConfig(root);
  const now = contentHash(root, { ignore: config.ignore ?? [] });
  if (now.value !== report.project.contentHash.value) {
    return { status: 'stale', message: `Report is stale: files changed since ${report.finishedAt} (${report.project.contentHash.fileCount} files then, ${now.fileCount} now). Run craft report.`, report };
  }
  return { status: 'fresh', message: `Report is fresh (highest tier ${report.highestTier}; ${report.summary.block} block, ${report.summary.warn} warn).`, report };
}
