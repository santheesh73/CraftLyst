// Adapter harness: loads an adapter file, opens the page under test in Chromium once per
// component, runs that component's suite, and collects results. Only file:// and loopback
// pages and requests are allowed unless allowNetwork is set (ADR-0012, ADR-0015).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SUITES, COMPONENTS } from './checks.js';
import { waitFor } from './dom.js';
import { isLoopback, resolveFrom, PINNED } from '../../../cli/src/shoot.js';
import { VERSION } from '../../../cli/src/version.js';

/** @typedef {import('./types.js').CheckResult} CheckResult */
/** @typedef {import('./types.js').Status} Status */

/**
 * @typedef {{ file?: string, url?: string, ready?: string }} PageSpec
 * @typedef {{
 *   name: string,
 *   library?: { name: string, version?: string | null, packages?: Record<string, string> },
 *   trust?: string,
 *   notes?: string,
 *   page: PageSpec,
 *   components: Record<string, Record<string, any>>
 * }} Adapter
 * @typedef {{ name: string, status: 'tested' | 'not_applicable', reason?: string, checks: CheckResult[] }} ComponentResult
 * @typedef {{ tool: string, kitVersion: string, adapter: { name: string, library: Adapter['library'] | null, trust: string | null }, summary: Record<Status, number>, components: ComponentResult[] }} RunResult
 */

const INSTALL = `npm install --save-dev --save-exact playwright@${PINNED.playwright} axe-core@${PINNED.axe} && npx playwright install chromium`;

/**
 * Validate an adapter object. Returns a list of problems (empty when valid).
 * @param {any} a
 * @returns {string[]}
 */
export function validateAdapter(a) {
  /** @type {string[]} */
  const p = [];
  if (!a || typeof a !== 'object') return ['adapter must be a JSON object'];
  if (typeof a.name !== 'string' || !a.name) p.push('"name" must be a non-empty string');
  if (!a.page || typeof a.page !== 'object' || (!a.page.file && !a.page.url)) p.push('"page" must have "file" or "url"');
  if (!a.components || typeof a.components !== 'object') p.push('"components" must be an object');
  else {
    for (const [k, v] of Object.entries(a.components)) {
      if (!COMPONENTS.includes(k)) p.push(`unknown component "${k}" (known: ${COMPONENTS.join(', ')})`);
      if (!v || typeof v !== 'object') p.push(`components.${k} must be an object`);
    }
  }
  return p;
}

/**
 * Turn a page spec into a URL, resolving files against the adapter's directory.
 * @param {PageSpec} spec
 * @param {string} baseDir
 * @param {boolean} allowNetwork
 * @returns {{ url: string } | { error: string }}
 */
export function pageUrl(spec, baseDir, allowNetwork) {
  if (spec.file) {
    const abs = resolvePath(baseDir, spec.file);
    if (!existsSync(abs)) return { error: `page file not found: ${abs}` };
    return { url: pathToFileURL(abs).href };
  }
  const url = String(spec.url);
  if (!isLoopback(url) && !allowNetwork) return { error: `${url} is not loopback or file://; pass --allow-network to test a remote page` };
  return { url };
}

/**
 * Run the kit for one adapter.
 * @param {Adapter} adapter
 * @param {{ baseDir: string, components?: string[], allowNetwork?: boolean, projectRoot?: string }} opts
 * @returns {Promise<{ status: 'ok', result: RunResult } | { status: 'unavailable' | 'usage', message: string }>}
 */
export async function runConformance(adapter, opts) {
  const problems = validateAdapter(adapter);
  if (problems.length) return { status: 'usage', message: `invalid adapter: ${problems.join('; ')}` };
  const wanted = opts.components ?? COMPONENTS;
  const unknown = wanted.filter((c) => !COMPONENTS.includes(c));
  if (unknown.length) return { status: 'usage', message: `unknown component(s): ${unknown.join(', ')}` };
  const main = pageUrl(adapter.page, opts.baseDir, Boolean(opts.allowNetwork));
  if ('error' in main) return { status: 'usage', message: main.error };

  const root = opts.projectRoot ?? process.cwd();
  const pwPath = resolveFrom(root, 'playwright');
  const axePath = resolveFrom(root, 'axe-core/axe.min.js');
  if (!pwPath || !axePath) {
    return { status: 'unavailable', message: `The conformance kit needs Playwright and axe-core (${[!pwPath && 'playwright', !axePath && 'axe-core'].filter(Boolean).join(', ')} missing). With the user's approval install the pinned versions:\n  ${INSTALL}\nUntil then, report conformance as not verified.` };
  }
  /** @type {any} */
  const pw = await import(pathToFileURL(pwPath).href);
  const chromium = pw.chromium ?? pw.default?.chromium;
  const axeSource = readFileSync(axePath, 'utf8');
  /** @type {any} */
  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    return { status: 'unavailable', message: `Chromium could not start: ${String(/** @type {Error} */ (err).message).split('\n')[0]}. With the user's approval run: npx playwright install chromium` };
  }

  /** @type {ComponentResult[]} */
  const components = [];
  try {
    for (const suite of SUITES) {
      if (!wanted.includes(suite.name)) continue;
      const cfg = adapter.components[suite.name];
      if (!cfg || cfg.notApplicable) {
        const reason = cfg?.notApplicable ?? 'not provided by this adapter';
        components.push({ name: suite.name, status: 'not_applicable', reason, checks: Object.entries(suite.checks).map(([id, requirement]) => ({ id, component: suite.name, requirement, status: /** @type {Status} */ ('not_applicable'), evidence: reason })) });
        continue;
      }
      /** @type {Map<string, CheckResult>} */
      const results = new Map();
      /** @type {(id: string, status: Status, evidence: string) => void} */
      const result = (id, status, evidence) => {
        if (!(id in suite.checks)) throw new Error(`suite ${suite.name} reported an undeclared check ${id}`);
        const prev = results.get(id);
        if (prev && prev.status === 'fail' && status !== 'fail') return; // a failure is never overwritten
        results.set(id, { id, component: suite.name, requirement: suite.checks[id], status, evidence });
      };
      const target = cfg.page ? pageUrl(cfg.page, opts.baseDir, Boolean(opts.allowNetwork)) : main;
      let error = '';
      if ('error' in target) error = target.error;
      else {
        const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
        await context.route('**/*', (/** @type {any} */ route) => {
          const u = route.request().url();
          if (opts.allowNetwork || isLoopback(u) || /^(data|blob|about):/.test(u)) return route.continue();
          return route.abort('blockedbyclient');
        });
        const page = await context.newPage();
        try {
          await page.goto(target.url, { waitUntil: 'load' });
          const ready = cfg.ready ?? adapter.page.ready;
          if (ready && !(await waitFor(async () => (await page.locator(ready).count()) > 0, 10000))) throw new Error(`ready selector ${ready} never appeared`);
          await suite.run({ page, cfg, axeSource, result });
        } catch (err) {
          error = String(/** @type {Error} */ (err).message).split('\n')[0];
        } finally {
          await context.close();
        }
      }
      const checks = Object.entries(suite.checks).map(([id, requirement]) => results.get(id) ?? { id, component: suite.name, requirement, status: /** @type {Status} */ ('fail'), evidence: error ? `not evaluated: kit error: ${error}` : 'not evaluated: an earlier step of this component failed' });
      components.push({ name: suite.name, status: 'tested', checks });
    }
  } finally {
    await browser.close();
  }
  /** @type {Record<Status, number>} */
  const summary = { pass: 0, fail: 0, not_applicable: 0 };
  for (const c of components) for (const k of c.checks) summary[k.status]++;
  return { status: 'ok', result: { tool: 'frontend-craft-conformance', kitVersion: VERSION, adapter: { name: adapter.name, library: adapter.library ?? null, trust: adapter.trust ?? null }, summary, components } };
}

/**
 * Markdown rendering of a run result. Deterministic for a given result.
 * @param {RunResult} r
 * @returns {string}
 */
export function toMarkdown(r) {
  const lib = r.adapter.library;
  const pkgs = lib?.packages ? Object.entries(lib.packages).map(([k, v]) => `${k}@${v}`).join(', ') : '';
  const label = { pass: 'PASS', fail: 'FAIL', not_applicable: 'N/A' };
  const lines = [
    `# Conformance: ${r.adapter.name}`,
    '',
    `- Kit: frontend-craft conformance ${r.kitVersion}`,
    `- Library: ${lib ? `${lib.name}${lib.version ? ` ${lib.version}` : ''}` : 'not stated'}${pkgs ? ` (${pkgs})` : ''}`,
    `- Trust: ${r.adapter.trust ?? 'not stated'}`,
    `- Summary: ${r.summary.pass} pass, ${r.summary.fail} fail, ${r.summary.not_applicable} not applicable`,
    ''
  ];
  for (const c of r.components) {
    const n = { pass: 0, fail: 0, not_applicable: 0 };
    for (const k of c.checks) n[k.status]++;
    lines.push(`## ${c.name}${c.status === 'not_applicable' ? ' (not applicable)' : ''}`, '');
    if (c.status === 'not_applicable') {
      lines.push(`${c.reason}`, '');
      continue;
    }
    lines.push(`${n.pass} pass, ${n.fail} fail, ${n.not_applicable} n/a`, '', '| Check | Result | Evidence |', '|---|---|---|');
    for (const k of c.checks) lines.push(`| \`${k.id}\` | ${label[k.status]} | ${k.evidence.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
    lines.push('');
  }
  return lines.join('\n');
}
