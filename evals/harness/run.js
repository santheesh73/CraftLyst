#!/usr/bin/env node
// Paired generation runner (P3). For each selected brief, repeat, and arm, creates a fresh
// workspace, copies the brief's seed, installs the packaged skill (skill arm only), and runs a
// configurable agent command in that workspace. Spawns the agent, so it is run by hand, never in CI.
//
// Layout: <out>/<runId>/<pairId>/<arm>/{workspace/, transcript.jsonl, stderr.log, final.md, run.json}
// The agent runs in a temp directory outside the repo; the workspace is copied back when it ends.
// The transcript and final answer are kept outside the workspace, so the agent cannot edit them.
//
// Usage: node evals/harness/run.js [--briefs a,b] [--arms skill,baseline] [--repeats 1]
//          [--agent-cmd "claude -p {prompt} ..."] [--timeout 900] [--concurrency 2]
//          [--run-id <id>] [--out <dir>] [--skill-dir dist/frontend-craft] [--dry-run]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { ARMS, BRIEFS_DIR, DEFAULT_AGENT_CMD, ISOLATE_UNSET, REPO, RUNS_DIR, buildAgentArgv, buildPrompt, loadBriefs, pairIds } from './lib.js';

const USAGE = `Usage: node evals/harness/run.js [options]
  --briefs <ids>       comma-separated brief ids (default: all in evals/briefs/index.json)
  --arms <arms>        skill,baseline (default both)
  --repeats <n>        generations per brief and arm (default 1); 12 briefs x 3 = 36 pairs
  --agent-cmd <cmd>    agent command with a {prompt} placeholder (default: ${DEFAULT_AGENT_CMD})
  --timeout <sec>      per-run timeout (default 900)
  --concurrency <n>    parallel runs (default 2)
  --run-id <id>        run id (default: UTC timestamp)
  --out <dir>          runs directory (default evals/harness/runs)
  --skill-dir <dir>    packaged skill (default dist/frontend-craft; build with npm run package)
  --briefs-dir <dir>   briefs directory (default evals/briefs)
  --dry-run            print what would run; create and spawn nothing
`;

/** @type {any} */
let values;
try {
  ({ values } = parseArgs({
    options: {
      briefs: { type: 'string' },
      arms: { type: 'string', default: ARMS.join(',') },
      repeats: { type: 'string', default: '1' },
      'agent-cmd': { type: 'string', default: DEFAULT_AGENT_CMD },
      timeout: { type: 'string', default: '900' },
      concurrency: { type: 'string', default: '2' },
      'run-id': { type: 'string' },
      out: { type: 'string', default: RUNS_DIR },
      'skill-dir': { type: 'string', default: join(REPO, 'dist', 'frontend-craft') },
      'briefs-dir': { type: 'string', default: BRIEFS_DIR },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false }
    }
  }));
} catch (err) {
  console.error(`${/** @type {Error} */ (err).message}\n${USAGE}`);
  process.exit(2);
}
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const briefsDir = resolve(values['briefs-dir']);
const all = loadBriefs(briefsDir);
const wanted = values.briefs ? String(values.briefs).split(',').map((s) => s.trim()).filter(Boolean) : all.map((b) => b.id);
const unknown = wanted.filter((id) => !all.some((b) => b.id === id));
if (unknown.length) {
  console.error(`Unknown brief id(s): ${unknown.join(', ')}. Known: ${all.map((b) => b.id).join(', ')}`);
  process.exit(2);
}
const arms = String(values.arms).split(',').map((s) => s.trim());
if (!arms.length || arms.some((a) => !(/** @type {readonly string[]} */ (ARMS)).includes(a))) {
  console.error(`--arms must be a subset of ${ARMS.join(',')}`);
  process.exit(2);
}
const repeats = Number(values.repeats);
const timeoutSec = Number(values.timeout);
const concurrency = Math.max(1, Number(values.concurrency) || 1);
if (!(repeats >= 1) || !(timeoutSec > 0)) {
  console.error('--repeats must be >= 1 and --timeout > 0');
  process.exit(2);
}
try {
  buildAgentArgv(values['agent-cmd'], 'x');
} catch (err) {
  console.error(/** @type {Error} */ (err).message);
  process.exit(2);
}
const skillDir = resolve(values['skill-dir']);
if (arms.includes('skill') && !existsSync(join(skillDir, 'SKILL.md'))) {
  console.error(`Packaged skill not found at ${skillDir} (no SKILL.md). Run npm run package first, or pass --skill-dir.`);
  process.exit(3);
}

const runId = values['run-id'] ?? new Date().toISOString().replace(/[:.]/g, '-');
if (!/^[A-Za-z0-9._-]+$/.test(runId)) {
  console.error('--run-id may contain only letters, digits, ".", "_" and "-"');
  process.exit(2);
}
const runDir = join(resolve(values.out), runId);

const jobs = pairIds(wanted, repeats).flatMap((p) => arms.map((arm) => ({ ...p, arm, brief: /** @type {import('./lib.js').Brief} */ (all.find((b) => b.id === p.briefId)) })));

if (values['dry-run']) {
  console.log(`Dry run: ${jobs.length} generation(s) in ${runDir}`);
  console.log(`Agent command: ${values['agent-cmd']}`);
  for (const j of jobs) console.log(`  ${j.pairId} ${j.arm.padEnd(8)} ${j.brief.stack}${j.brief.seed ? ` seed=${j.brief.seed}` : ''}${j.arm === 'skill' ? ` skill=${skillDir}` : ''}`);
  process.exit(0);
}

if (existsSync(runDir) && !values['run-id']) {
  console.error(`${runDir} already exists.`);
  process.exit(2);
}
mkdirSync(runDir, { recursive: true });
writeFileSync(join(runDir, 'run-meta.json'), JSON.stringify({ runId, startedAt: new Date().toISOString(), agentCmd: values['agent-cmd'], timeoutSec, repeats, arms, briefs: wanted, skillDir }, null, 2) + '\n');

/**
 * @param {typeof jobs[number]} job
 * @returns {Promise<any>}
 */
async function runJob(job) {
  const armDir = join(runDir, job.pairId, job.arm);
  // The agent works in a temp directory outside this repository, so it cannot discover the repo
  // (its SKILL.md, references, or history); the result is copied back when the run ends.
  const ws = mkdtempSync(join(tmpdir(), `craft-eval-${job.arm}-`));
  if (existsSync(join(armDir, 'run.json'))) {
    console.log(`${job.pairId} ${job.arm}: already ran, skipping`);
    return JSON.parse(readFileSync(join(armDir, 'run.json'), 'utf8'));
  }
  mkdirSync(armDir, { recursive: true });
  if (job.brief.seed) cpSync(join(briefsDir, job.brief.seed), ws, { recursive: true });
  if (job.arm === 'skill') cpSync(skillDir, join(ws, '.claude', 'skills', 'frontend-craft'), { recursive: true });
  const prompt = buildPrompt(readFileSync(join(briefsDir, job.brief.path), 'utf8'), Boolean(job.brief.seed));
  writeFileSync(join(armDir, 'prompt.md'), prompt);
  const [cmd, ...args] = buildAgentArgv(values['agent-cmd'], prompt);

  /** @type {Record<string, string | undefined>} */
  const env = { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' };
  for (const k of ISOLATE_UNSET) delete env[k];
  const started = Date.now();
  const transcript = createWriteStream(join(armDir, 'transcript.jsonl'));
  const stderrLog = createWriteStream(join(armDir, 'stderr.log'));
  let stdout = '';
  /** @type {{ code: number | null, signal: string | null, error: string | null }} */
  const exit = await new Promise((done) => {
    const child = spawn(cmd, args, { cwd: ws, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutSec * 1000);
    child.stdout.on('data', (d) => {
      stdout += d;
      transcript.write(d);
    });
    child.stderr.on('data', (d) => stderrLog.write(d));
    child.on('error', (err) => {
      clearTimeout(timer);
      done({ code: null, signal: null, error: err.message });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      done({ code, signal, error: signal ? `killed by ${signal} (timeout ${timeoutSec}s)` : null });
    });
  });
  transcript.end();
  stderrLog.end();
  cpSync(ws, join(armDir, 'workspace'), { recursive: true, verbatimSymlinks: true });
  rmSync(ws, { recursive: true, force: true });
  const parsed = parseTranscript(stdout);
  writeFileSync(join(armDir, 'final.md'), parsed.finalAnswer + '\n');
  const record = {
    pairId: job.pairId, briefId: job.briefId, repeat: job.repeat, arm: job.arm,
    startedAt: new Date(started).toISOString(), durationMs: Date.now() - started,
    exitCode: exit.code, error: exit.error ?? (exit.code !== 0 ? `exit ${exit.code}` : null),
    model: parsed.model, skillsSeen: parsed.skills, skillInvoked: parsed.skillInvoked, numTurns: parsed.numTurns, costUsd: parsed.costUsd
  };
  writeFileSync(join(armDir, 'run.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(`${job.pairId} ${job.arm.padEnd(8)} ${record.error ?? 'ok'} in ${Math.round(record.durationMs / 1000)} s${parsed.skillInvoked ? ' (skill invoked)' : ''}`);
  return record;
}

/**
 * Read a stream-json transcript (Claude Code). Falls back to raw stdout for other agents.
 * @param {string} stdout
 */
function parseTranscript(stdout) {
  /** @type {string | null} */
  let finalAnswer = null;
  /** @type {string | null} */
  let model = null;
  /** @type {string[]} */
  let skills = [];
  let skillInvoked = false;
  /** @type {number | null} */
  let numTurns = null;
  /** @type {number | null} */
  let costUsd = null;
  for (const line of stdout.split('\n')) {
    /** @type {any} */
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e?.type === 'system' && e.subtype === 'init') {
      model = e.model ?? null;
      skills = Array.isArray(e.skills) ? e.skills.map(String) : Array.isArray(e.slash_commands) ? e.slash_commands.map(String) : [];
    }
    if (e?.type === 'assistant') {
      for (const c of e.message?.content ?? []) if (c.type === 'tool_use' && c.name === 'Skill' && String(c.input?.skill ?? '').includes('frontend-craft')) skillInvoked = true;
    }
    if (e?.type === 'result') {
      finalAnswer = typeof e.result === 'string' ? e.result : null;
      numTurns = e.num_turns ?? null;
      costUsd = e.total_cost_usd ?? null;
    }
  }
  return { finalAnswer: finalAnswer ?? stdout.slice(-8000), model, skills, skillInvoked, numTurns, costUsd };
}

/** @type {any[]} */
const records = [];
let next = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (next < jobs.length) records.push(await runJob(jobs[next++]));
}));
const failed = records.filter((r) => r.error);
console.log(`\n${records.length - failed.length}/${records.length} generation(s) finished without error. Run: ${runDir}`);
console.log(`Next: node evals/harness/metrics.js --run-id ${runId}`);
process.exit(failed.length ? 1 : 0);
