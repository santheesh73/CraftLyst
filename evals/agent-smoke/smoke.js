#!/usr/bin/env node
// V3 agent smoke test helper. `prepare` sets up a fresh Fieldnote project with the skill
// installed for one agent and prints the task to paste. `check` looks at what the agent left
// behind, pre-checks the five expected behaviors it can see in files (and in a saved
// transcript, if given), asks the person to confirm each one, and with --record writes the
// person's verdict to adapters/verification.json and regenerates docs/compatibility.md.
// It never records a result the person did not confirm.
//
// Usage:
//   node evals/agent-smoke/smoke.js prepare --agent <id> [--dir <new folder>]
//   node evals/agent-smoke/smoke.js check --agent <id> --dir <folder> [--transcript <file>]
//          [--agent-version <v>] [--record]
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { listFiles } from '../../cli/src/files.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
export const PROJECT = join(HERE, 'project');
export const TASK = readFileSync(join(HERE, 'task.md'), 'utf8').trim();

/** Number-like content the task forbids inventing. Matched only on lines the agent added. */
const FABRICATION = /** @type {[RegExp, string][]} */ ([
  [/[$€£¥₹]\s?\d/, 'price'],
  [/\b\d+(?:[.,]\d+)?\s?(?:USD|EUR|GBP|INR)\b|\d\s?(?:\/\s?mo(?:nth)?|\/\s?yr|per (?:month|year|user))\b/i, 'price'],
  // "Up to 10 researchers" is the Team plan from the task, not a user count.
  [/(?<!up to\s*|for\s*)\b\d[\d,.]*\s?[kKmM]?\+?\s+(?:users|researchers|teams|customers|companies|downloads|scientists)\b/i, 'user count'],
  [/\btestimonial\b|<blockquote\b/i, 'testimonial']
]);

/**
 * @typedef {{ id: number, label: string, auto: 'yes' | 'no' | 'unknown', evidence: string }} Behavior
 */

/**
 * Lines added by the agent that look like invented prices, counts, or testimonials.
 * @param {string} dir
 * @returns {{ file: string, line: number, kind: string, text: string }[]}
 */
export function fabricationHits(dir) {
  /** @type {{ file: string, line: number, kind: string, text: string }[]} */
  const hits = [];
  for (const file of listFiles(dir, { ignore: ['AGENTS.md', 'CONVENTIONS.md'] })) {
    const before = existsSync(join(PROJECT, file)) ? new Set(readFileSync(join(PROJECT, file), 'utf8').split('\n').map((l) => l.trim())) : new Set();
    readFileSync(join(dir, file), 'utf8').split('\n').forEach((raw, i) => {
      const text = raw.trim();
      if (!text || before.has(text)) return;
      for (const [re, kind] of FABRICATION) if (re.test(text)) { hits.push({ file, line: i + 1, kind, text: text.slice(0, 120) }); break; }
    });
  }
  return hits;
}

/**
 * What the files (and optional transcript) show for each expected behavior.
 * @param {string} dir
 * @param {string} [transcript]
 * @returns {Behavior[]}
 */
export function autoChecks(dir, transcript) {
  const t = transcript ?? null;
  const design = join(dir, '.craft', 'DESIGN.md');
  const designText = existsSync(design) ? readFileSync(design, 'utf8') : '';
  const report = join(dir, '.craft', 'reports', 'latest.json');
  const hits = fabricationHits(dir);
  const ranLint = t !== null && /craft(\.js)?\s+(lint|report)\b/.test(t);
  const tier = t !== null ? /Highest tier reached:\s*T[0-3]/.exec(t) : null;
  /** @type {Behavior[]} */
  return [
    {
      id: 1, label: 'Reads SKILL.md before editing',
      auto: t === null ? 'unknown' : /SKILL\.md/.test(t) ? 'yes' : 'no',
      evidence: t === null ? 'no transcript given: check the agent session' : /SKILL\.md/.test(t) ? 'transcript mentions SKILL.md (confirm it was read before the first edit)' : 'transcript never mentions SKILL.md'
    },
    {
      id: 2, label: 'Creates .craft/DESIGN.md about Fieldnote',
      auto: !designText ? 'no' : /fieldnote/i.test(designText) && !/\{\{/.test(designText) ? 'yes' : 'no',
      evidence: !designText ? '.craft/DESIGN.md is missing' : `${designText.split('\n').length} lines; ${/fieldnote/i.test(designText) ? 'mentions Fieldnote' : 'never mentions Fieldnote'}; ${/\{\{/.test(designText) ? 'still has {{placeholders}}' : 'no template placeholders left'}`
    },
    {
      id: 3, label: 'Runs craft lint (or craft report)',
      auto: existsSync(report) || ranLint ? 'yes' : t === null ? 'unknown' : 'no',
      evidence: [existsSync(report) ? '.craft/reports/latest.json exists (craft report runs lint)' : 'no .craft/reports/latest.json', t === null ? '' : ranLint ? 'transcript shows craft lint/report' : 'transcript shows no craft lint/report'].filter(Boolean).join('; ')
    },
    {
      id: 4, label: 'Final message starts with the highest tier and lists only checks that ran',
      auto: t === null ? 'unknown' : tier ? 'yes' : 'no',
      evidence: t === null ? 'no transcript given: read the final message' : tier ? `found "${tier[0]}" (confirm it opens the final message and the listed checks ran)` : 'no "Highest tier reached:" line in the transcript'
    },
    {
      id: 5, label: 'No invented prices, user counts, or testimonials',
      auto: hits.length ? 'no' : 'yes',
      evidence: hits.length ? hits.slice(0, 5).map((h) => `${h.kind} at ${h.file}:${h.line}: ${h.text}`).join(' | ') : 'no price, count, or testimonial patterns in lines the agent added'
    }
  ];
}

/**
 * One row for results-template.md.
 * @param {{ agent: string, version: string, date: string, answers: boolean[], notes: string }} r
 */
export function resultRow(r) {
  const yn = (/** @type {boolean} */ b) => (b ? 'yes' : 'no');
  const pass = r.answers.every(Boolean);
  return `| ${r.agent} | ${r.version} | ${r.date} | node install.mjs install --agent ${r.agent} | ${r.answers.map(yn).join(' | ')} | ${pass ? 'pass' : 'fail'} | ${r.notes.replace(/\|/g, '/')} |`;
}

/**
 * Write a person's V3 verdict into verification.json.
 * @param {string} file
 * @param {string} agent
 * @param {{ result: 'pass' | 'fail', date: string, tool: string, evidence: string }} v3
 */
export function recordV3(file, agent, v3) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  data.agents[agent] ??= {};
  data.agents[agent].v3 = { result: v3.result, date: v3.date, tool: v3.tool, command: 'evals/agent-smoke/task.md in a fresh session', evidence: v3.evidence };
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

/** @param {string} agent */
function knownAgent(agent) {
  return existsSync(join(REPO, 'adapters', agent, 'adapter.json'));
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const { values } = parseArgs({
    args,
    options: {
      agent: { type: 'string' }, dir: { type: 'string' }, transcript: { type: 'string' },
      'agent-version': { type: 'string' }, record: { type: 'boolean', default: false }
    }
  });
  const agent = String(values.agent ?? '');
  if (!['prepare', 'check'].includes(String(cmd)) || !agent) {
    console.error('Usage:\n  node evals/agent-smoke/smoke.js prepare --agent <id> [--dir <new folder>]\n  node evals/agent-smoke/smoke.js check --agent <id> --dir <folder> [--transcript <file>] [--agent-version <v>] [--record]\nAgent ids: node install.mjs list');
    process.exit(2);
  }
  if (!knownAgent(agent)) {
    console.error(`Unknown agent id "${agent}". Use an id from: node install.mjs list`);
    process.exit(2);
  }

  if (cmd === 'prepare') {
    const date = new Date().toISOString().slice(0, 10);
    const dir = resolve(String(values.dir ?? join(tmpdir(), `fieldnote-${agent}-${date}-${process.pid}`)));
    if (existsSync(dir) && readdirSync(dir).length) {
      console.error(`${dir} is not empty. Pass --dir with a new or empty folder.`);
      process.exit(2);
    }
    mkdirSync(dir, { recursive: true });
    cpSync(PROJECT, dir, { recursive: true });
    if (!existsSync(join(REPO, 'dist', 'frontend-craft', 'SKILL.md'))) {
      console.log('Building dist/frontend-craft (npm run package) ...');
      const p = spawnSync(process.execPath, [join(REPO, 'scripts', 'package.js')], { cwd: REPO, stdio: 'inherit' });
      if (p.status !== 0) process.exit(3);
    }
    const inst = spawnSync(process.execPath, [join(REPO, 'install.mjs'), 'install', '--agent', agent, '--target', dir], { cwd: REPO, stdio: 'inherit' });
    if (inst.status !== 0) process.exit(inst.status ?? 3);
    const rel = relative(process.cwd(), HERE) || '.';
    console.log([
      '',
      `Ready: ${dir}`,
      '',
      `1. Open ${agent} in that folder, in a fresh session (for a terminal agent: cd "${dir}" and start it there).`,
      '2. Paste exactly this task:',
      '',
      ...TASK.split('\n').map((l) => `   ${l}`),
      '',
      '3. When it finishes, save the session transcript to a file if the agent can export one (optional, it lets the check pre-fill two answers).',
      `4. Run: node ${join(rel, 'smoke.js')} check --agent ${agent} --dir "${dir}" [--transcript <file>] --agent-version <version> --record`
    ].join('\n'));
    return;
  }

  const dir = resolve(String(values.dir ?? ''));
  if (!values.dir || !existsSync(join(dir, 'index.html'))) {
    console.error('Pass --dir with the folder the agent worked in (the one prepare created).');
    process.exit(2);
  }
  const transcript = values.transcript ? readFileSync(resolve(String(values.transcript)), 'utf8') : undefined;
  const checks = autoChecks(dir, transcript);
  console.log(`V3 smoke check for ${agent} in ${dir}\n`);
  for (const c of checks) console.log(`${c.id}. ${c.label}\n   seen: ${c.auto}. ${c.evidence}`);
  console.log('');

  if (!process.stdin.isTTY) {
    console.log('Not an interactive terminal, so nothing is recorded: a V3 result needs your yes/no on each behavior. Run this again in a terminal.');
    return;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  /** @type {boolean[]} */
  const answers = [];
  for (const c of checks) {
    const hint = c.auto === 'yes' ? 'Y/n' : c.auto === 'no' ? 'y/N' : 'y/n';
    let a = '';
    while (!/^(y|n|yes|no)$/i.test(a)) {
      a = (await rl.question(`Did the agent do ${c.id} (${c.label})? [${hint}] `)).trim();
      if (!a && c.auto !== 'unknown') a = c.auto === 'yes' ? 'y' : 'n';
    }
    answers.push(/^y/i.test(a));
  }
  const version = String(values['agent-version'] ?? '') || (await rl.question(`${agent} version (for the record): `)).trim() || 'unknown';
  const notes = (await rl.question('Notes (optional): ')).trim();
  rl.close();

  const date = new Date().toISOString().slice(0, 10);
  const pass = answers.every(Boolean);
  console.log(`\nResult: ${pass ? 'PASS' : 'FAIL'}\n\nRow for results-template.md:\n${resultRow({ agent, version, date, answers, notes })}`);
  if (!values.record) {
    console.log('\nNot recorded (add --record to write adapters/verification.json and regenerate docs/compatibility.md).');
    return;
  }
  const failed = checks.filter((_, i) => !answers[i]).map((c) => c.id);
  recordV3(join(REPO, 'adapters', 'verification.json'), agent, {
    result: pass ? 'pass' : 'fail',
    date,
    tool: `${agent} ${version}`,
    evidence: `${pass ? 'all 5 behaviors confirmed by the person who ran it' : `behavior(s) ${failed.join(', ')} not met, per the person who ran it`}${notes ? `; ${notes}` : ''}`
  });
  const gen = spawnSync(process.execPath, [join(REPO, 'scripts', 'generate-agent-docs.js')], { cwd: REPO, stdio: 'inherit' });
  console.log(gen.status === 0 ? '\nRecorded in adapters/verification.json; docs/compatibility.md regenerated. Commit both files.' : '\nRecorded, but regenerating the docs failed; run node scripts/generate-agent-docs.js.');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) await main();
