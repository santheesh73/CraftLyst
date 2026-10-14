#!/usr/bin/env node
// Skill trigger tests against headless Claude Code (ADR-0010).
// For each prompt in prompts.json, runs `claude -p` in a temporary project that has the
// packaged skill installed, and records whether the Skill tool was invoked with
// frontend-craft. Writes results to evals/triggers/results/. Never fabricates results:
// if the claude CLI is missing it exits 3 without writing anything.
//
// Usage: node evals/triggers/run.js [--concurrency 4] [--only t01,n03] [--model <id>] [--timeout 180]
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');

const { values } = parseArgs({
  options: {
    concurrency: { type: 'string', default: '4' },
    only: { type: 'string' },
    model: { type: 'string' },
    timeout: { type: 'string', default: '180' },
    label: { type: 'string' }
  }
});

/** Environment variables that would leak the parent session's memory or identity into child runs. */
const ISOLATE_UNSET = [
  'CLAUDE_COWORK_MEMORY_PATH_OVERRIDE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_PROJECTS_SESSION',
  'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD'
];
/** Tools that could change files or reach the network are disabled; detection only needs the first tool call. */
const DISALLOWED = ['Bash', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Task', 'Agent'];

const version = spawnSync('claude', ['--version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  console.error('The claude CLI is not available, so trigger tests cannot run. Install Claude Code and sign in, then retry. No results were written.');
  process.exit(3);
}
const claudeVersion = version.stdout.trim();

if (!existsSync(join(repo, 'dist', 'frontend-craft', 'SKILL.md'))) {
  const r = spawnSync(process.execPath, [join(repo, 'scripts', 'package.js')], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
}
const project = mkdtempSync(join(tmpdir(), 'craft-triggers-'));
const inst = spawnSync(process.execPath, [join(repo, 'scripts', 'install-claude-code.js'), '--project', project], { encoding: 'utf8' });
if (inst.status !== 0) {
  console.error(`Could not install the skill into ${project}: ${inst.stderr}`);
  process.exit(3);
}

const skillMd = readFileSync(join(repo, 'dist', 'frontend-craft', 'SKILL.md'), 'utf8');
const description = /^description: (.*)$/m.exec(skillMd)?.[1] ?? '';

/** @type {{ id: string, expect: boolean, category: string, near_miss?: boolean, prompt: string }[]} */
let prompts = JSON.parse(readFileSync(join(here, 'prompts.json'), 'utf8')).prompts;
if (values.only) {
  const ids = new Set(String(values.only).split(','));
  prompts = prompts.filter((p) => ids.has(p.id));
}

/**
 * @param {string} prompt
 * @returns {Promise<{ triggered: boolean, skills: string[], model: string | null, error: string | null, firstTool: string | null }>}
 */
function runOne(prompt) {
  return new Promise((resolve) => {
    /** @type {Record<string, string | undefined>} */
    const env = { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' };
    for (const k of ISOLATE_UNSET) delete env[k];
    const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--max-turns', '2', '--setting-sources', 'project', '--disallowedTools', DISALLOWED.join(',')];
    if (values.model) args.push('--model', String(values.model));
    const child = spawn('claude', args, { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    let stderr = '';
    /** @type {string[]} */
    const skills = [];
    /** @type {string | null} */
    let model = null;
    /** @type {string | null} */
    let firstTool = null;
    const timer = setTimeout(() => child.kill('SIGTERM'), Number(values.timeout) * 1000);
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        /** @type {any} */
        let e;
        try {
          e = JSON.parse(line);
        } catch {
          continue;
        }
        if (e.type === 'system' && e.subtype === 'init') model = e.model ?? null;
        if (e.type === 'assistant') {
          for (const c of e.message?.content ?? []) {
            if (c.type !== 'tool_use') continue;
            firstTool ??= c.name;
            if (c.name === 'Skill') skills.push(String(c.input?.skill ?? c.input?.command ?? ''));
          }
        }
      }
    });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const error = signal ? `killed by ${signal} (timeout ${values.timeout}s)` : code !== 0 && !skills.length && !firstTool ? `exit ${code}: ${stderr.trim().slice(0, 300)}` : null;
      resolve({ triggered: skills.includes('frontend-craft'), skills, model, error, firstTool });
    });
  });
}

const started = new Date().toISOString();
/** @type {any[]} */
const results = new Array(prompts.length);
let next = 0;
const workers = Array.from({ length: Math.max(1, Number(values.concurrency)) }, async () => {
  while (next < prompts.length) {
    const idx = next++;
    const p = prompts[idx];
    const r = await runOne(p.prompt);
    const correct = r.error ? null : r.triggered === p.expect;
    results[idx] = { ...p, ...r, correct };
    console.log(`${p.id} expect=${p.expect ? 'trigger' : 'skip   '} got=${r.error ? 'ERROR  ' : r.triggered ? 'trigger' : 'skip   '} ${correct === null ? '?' : correct ? 'ok' : 'WRONG'}${r.skills.length ? ` skills=${r.skills.join('|')}` : ''}${r.error ? ` (${r.error})` : ''}`);
  }
});
await Promise.all(workers);

const scored = results.filter((r) => r.correct !== null);
const correct = scored.filter((r) => r.correct).length;
/** @param {boolean} expect */
const subset = (expect) => {
  const s = scored.filter((r) => r.expect === expect);
  return { total: s.length, correct: s.filter((r) => r.correct).length };
};
const summary = {
  schemaVersion: '1.0',
  label: values.label ?? null,
  startedAt: started,
  finishedAt: new Date().toISOString(),
  claudeCodeVersion: claudeVersion,
  models: [...new Set(results.map((r) => r.model).filter(Boolean))],
  descriptionChars: description.length,
  description,
  prompts: results.length,
  scored: scored.length,
  errors: results.length - scored.length,
  accuracy: scored.length ? Math.round((correct / scored.length) * 1000) / 10 : null,
  shouldTrigger: subset(true),
  shouldNotTrigger: subset(false),
  isolation: { settingSources: 'project', unsetEnv: ISOLATE_UNSET, disallowedTools: DISALLOWED, maxTurns: 2 },
  results: results.map(({ id, expect, category, near_miss, triggered, skills, firstTool, correct: c, error, model }) => ({ id, expect, category, near_miss: near_miss ?? false, triggered, skills, firstTool, correct: c, error, model }))
};
const outDir = join(here, 'results');
mkdirSync(outDir, { recursive: true });
const stamp = started.replace(/[:.]/g, '-');
writeFileSync(join(outDir, `${stamp}.json`), JSON.stringify(summary, null, 2) + '\n');
writeFileSync(join(outDir, 'latest.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(`\nAccuracy ${summary.accuracy}% (${correct}/${scored.length} scored, ${summary.errors} errors). Should-trigger ${summary.shouldTrigger.correct}/${summary.shouldTrigger.total}, should-not ${summary.shouldNotTrigger.correct}/${summary.shouldNotTrigger.total}.`);
console.log(`Claude Code ${claudeVersion}; model(s) ${summary.models.join(', ') || 'unknown'}. Results: evals/triggers/results/${stamp}.json`);
process.exit(0);
