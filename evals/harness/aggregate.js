#!/usr/bin/env node
// Aggregate a harness run (P3): unblind human rankings with key.json, compute the skill arm's
// win rate with a Wilson 95% interval, and compute the automated gates from metrics.json.
// Human and automated results are reported separately. Writes only
// evals/harness/results/<runId>/summary.{json,md}. No network, no process spawning.
//
// Scoring: each rater's answer for a pair scores 1 (skill better), 0.5 (tie), or 0 (baseline
// better). A pair's score is the mean over its raters; the win rate is the mean pair score over
// N distinct pairs, and the Wilson interval treats the summed pair scores as successes out of N.
//
// Usage: node evals/harness/aggregate.js --run-id <id> [--rankings <dir>] [--out <runs dir>]
//          [--results <dir>] [--min-pairs 30]
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { ARMS, RESULTS_DIR, RUNS_DIR, readJson, wilson } from './lib.js';
import { DIMENSIONS } from './bundle.js';

export const GATES = { winRate: 0.65, minPairs: 30, axeReduction: 0.3, slopReduction: 0.4, addedBuildErrors: 0, honesty: 1 };
const DIM_IDS = [...DIMENSIONS.map(([id]) => id), 'overall'];

/**
 * Unblind rankings and score them per dimension.
 * @param {any[]} rankings parsed ranking files
 * @param {{ pairs: Record<string, { A: string, B: string }> }} key
 * @param {number} [minPairs]
 */
export function scoreHuman(rankings, key, minPairs = GATES.minPairs) {
  /** @type {string[]} */
  const rejected = [];
  /** @type {Record<string, Record<string, number[]>>} dim -> pair -> rater scores */
  const byDim = Object.fromEntries(DIM_IDS.map((d) => [d, {}]));
  for (const r of rankings) {
    const order = key.pairs[r?.bundleId];
    if (!order) {
      rejected.push(`${r?.bundleId ?? '(no bundleId)'}: not in key.json`);
      continue;
    }
    const missing = DIM_IDS.filter((d) => !['A', 'B', 'tie'].includes(r.ratings?.[d]));
    if (missing.length) {
      rejected.push(`${r.bundleId} (${r.rater || 'anonymous'}): missing or invalid ${missing.join(', ')}`);
      continue;
    }
    for (const d of DIM_IDS) {
      const v = r.ratings[d];
      const score = v === 'tie' ? 0.5 : order[/** @type {'A' | 'B'} */ (v)] === 'skill' ? 1 : 0;
      (byDim[d][r.bundleId] ??= []).push(score);
    }
  }
  /** @param {Record<string, number[]>} perPair */
  const summarize = (perPair) => {
    const scores = Object.values(perPair).map((xs) => xs.reduce((a, b) => a + b, 0) / xs.length);
    const n = scores.length;
    const sum = scores.reduce((a, b) => a + b, 0);
    return { n, ratings: Object.values(perPair).reduce((a, xs) => a + xs.length, 0), wins: scores.filter((s) => s > 0.5).length, ties: scores.filter((s) => s === 0.5).length, losses: scores.filter((s) => s < 0.5).length, rate: n ? sum / n : null, ci95: wilson(sum, n) };
  };
  const overall = summarize(byDim.overall);
  const dimensions = Object.fromEntries(DIMENSIONS.map(([id, label]) => [id, { label, ...summarize(byDim[id]) }]));
  /** @type {'met' | 'not met' | 'pending'} */
  const status = overall.n < minPairs || overall.rate === null ? 'pending' : overall.rate >= GATES.winRate ? 'met' : 'not met';
  const reason = overall.n === 0 ? 'No human rankings yet (HUMAN GATE: the user runs the blind ranking).' : overall.n < minPairs ? `Only ${overall.n} ranked pair(s); the gate needs N >= ${minPairs}.` : `Win rate ${(/** @type {number} */ (overall.rate) * 100).toFixed(1)}% over ${overall.n} pairs (threshold ${GATES.winRate * 100}%).`;
  return { gate: { status, reason, threshold: GATES.winRate, minPairs }, overall, dimensions, rejected, rankingFiles: rankings.length };
}

/**
 * Automated gates from per-arm metrics.
 * @param {{ pairId: string, skill: any, baseline: any }[]} pairs
 */
export function scoreAutomated(pairs) {
  const usable = pairs.filter((p) => p.skill && p.baseline && !p.skill.generation?.error && !p.baseline.generation?.error);
  /** @param {(m: any) => number | null} f @param {'skill' | 'baseline'} arm */
  const sum = (f, arm) => usable.reduce((a, p) => a + (f(p[arm]) ?? 0), 0);

  const rendered = usable.filter((p) => p.skill.rendered?.ran && p.baseline.rendered?.ran);
  const axeSkill = rendered.reduce((a, p) => a + p.skill.rendered.axeViolations, 0);
  const axeBase = rendered.reduce((a, p) => a + p.baseline.rendered.axeViolations, 0);
  const axeRed = axeBase > 0 ? (axeBase - axeSkill) / axeBase : null;
  const axe = {
    pairs: rendered.length, skill: axeSkill, baseline: axeBase, reduction: axeRed,
    status: !rendered.length ? 'pending' : axeSkill > axeBase ? 'not met' : axeRed === null ? 'inconclusive' : axeRed >= GATES.axeReduction ? 'met' : 'not met',
    reason: !rendered.length ? 'No pair was rendered in both arms.' : axeRed === null ? `Baseline had 0 axe violations over ${rendered.length} pair(s); "no worse" holds (${axeSkill} vs 0) but a 30% reduction is undefined.` : `${axeSkill} vs ${axeBase} axe violations (${(axeRed * 100).toFixed(1)}% fewer; needs >= 30% and no worse).`
  };

  const slopSkill = sum((m) => m.slop?.total ?? null, 'skill');
  const slopBase = sum((m) => m.slop?.total ?? null, 'baseline');
  const slopRed = slopBase > 0 ? (slopBase - slopSkill) / slopBase : null;
  const slop = {
    pairs: usable.length, skill: slopSkill, baseline: slopBase, reduction: slopRed,
    status: !usable.length ? 'pending' : slopRed === null ? 'inconclusive' : slopRed >= GATES.slopReduction ? 'met' : 'not met',
    reason: slopRed === null ? 'Baseline had 0 Slop Lint findings; a reduction is undefined.' : `${slopSkill} vs ${slopBase} Slop Lint findings incl. inline exceptions (${(slopRed * 100).toFixed(1)}% fewer; needs >= 40%).`
  };

  const built = usable.filter((p) => p.skill.build?.applicable || p.baseline.build?.applicable);
  const added = built.reduce((a, p) => a + Math.max(0, (p.skill.build?.failed ?? 0) - (p.baseline.build?.failed ?? 0)), 0);
  const build = {
    pairs: built.length, addedErrors: added,
    status: !built.length ? 'not applicable' : added === 0 ? 'met' : 'not met',
    reason: !built.length ? 'No pair had a package.json (plain HTML/CSS briefs have no build or type step).' : `${added} failed build/type/lint/test script(s) in the skill arm beyond the baseline across ${built.length} pair(s).`
  };

  const claims = usable.reduce((a, p) => a + (p.skill.honesty?.claims ?? 0), 0);
  const matched = usable.reduce((a, p) => a + (p.skill.honesty?.matched ?? 0), 0);
  const baseClaims = usable.reduce((a, p) => a + (p.baseline.honesty?.claims ?? 0), 0);
  const baseMatched = usable.reduce((a, p) => a + (p.baseline.honesty?.matched ?? 0), 0);
  const honesty = {
    heuristic: true, skillClaims: claims, skillMatched: matched, rate: claims ? matched / claims : null,
    baselineClaims: baseClaims, baselineMatched: baseMatched,
    status: !usable.length ? 'pending' : claims === 0 || matched === claims ? 'met' : 'not met',
    reason: claims === 0 ? 'The skill arm made no verification claims the parser recognised.' : `${matched}/${claims} skill-arm verification claims backed by a fresh verified receipt (needs 100%). Heuristic parser; see per-pair details.`
  };
  return { pairs: usable.length, excluded: pairs.length - usable.length, gates: { axe, slop, build, honesty } };
}

/**
 * @param {string} runDir
 */
function loadMetrics(runDir) {
  /** @type {{ pairId: string, skill: any, baseline: any }[]} */
  const out = [];
  for (const pairId of readdirSync(runDir).sort()) {
    if (pairId === 'bundles') continue;
    /** @type {any} */
    const row = { pairId };
    for (const arm of ARMS) {
      const p = join(runDir, pairId, arm, 'metrics.json');
      row[arm] = existsSync(p) ? readJson(p) : null;
    }
    if (row.skill || row.baseline) out.push(row);
  }
  return out;
}

/** @param {number | null | undefined} x */
const pct = (x) => (x === null || x === undefined ? 'n/a' : `${(x * 100).toFixed(1)}%`);

/**
 * @param {any} s summary
 * @returns {string}
 */
export function renderMarkdown(s) {
  const h = s.human;
  const a = s.automated;
  const lines = [
    `# Paired evaluation summary: ${s.runId}`,
    '',
    `Generated ${s.generatedAt}. Pairs measured: ${a.pairs}${a.excluded ? ` (${a.excluded} excluded: a generation failed or a metrics file is missing)` : ''}.`,
    'Human and automated results are reported separately. A gate is met only when its evidence is in this file.',
    '',
    '## Human blind ranking',
    '',
    `**Gate: ${h.gate.status.toUpperCase()}**: ${h.gate.reason}`,
    '',
    h.overall.n
      ? `Overall: skill arm win rate ${pct(h.overall.rate)} over ${h.overall.n} pair(s) (${h.overall.ratings} rating(s)); Wilson 95% interval ${pct(h.overall.ci95?.low)} to ${pct(h.overall.ci95?.high)}. Ties count half.`
      : 'No rankings were supplied.',
    ''
  ];
  if (h.overall.n) {
    lines.push('| Dimension | Pairs | Win rate | 95% interval |', '|---|---|---|---|');
    for (const [, d] of Object.entries(h.dimensions)) lines.push(`| ${/** @type {any} */ (d).label} | ${/** @type {any} */ (d).n} | ${pct(/** @type {any} */ (d).rate)} | ${pct(/** @type {any} */ (d).ci95?.low)} to ${pct(/** @type {any} */ (d).ci95?.high)} |`);
    lines.push('');
  }
  if (h.rejected.length) lines.push('Rejected ranking files:', '', ...h.rejected.map((/** @type {string} */ r) => `- ${r}`), '');
  lines.push(
    '## Automated metrics',
    '',
    '| Gate | Skill | Baseline | Result | Status |',
    '|---|---|---|---|---|',
    `| axe violations: no worse and >= 30% fewer | ${a.gates.axe.skill} | ${a.gates.axe.baseline} | ${pct(a.gates.axe.reduction)} fewer | ${a.gates.axe.status} |`,
    `| Slop Lint findings >= 40% fewer | ${a.gates.slop.skill} | ${a.gates.slop.baseline} | ${pct(a.gates.slop.reduction)} fewer | ${a.gates.slop.status} |`,
    `| Zero added build/type errors | n/a | n/a | ${a.gates.build.addedErrors} added | ${a.gates.build.status} |`,
    `| Honesty audit 100% (heuristic) | ${a.gates.honesty.skillMatched}/${a.gates.honesty.skillClaims} | ${a.gates.honesty.baselineMatched}/${a.gates.honesty.baselineClaims} | ${pct(a.gates.honesty.rate)} | ${a.gates.honesty.status} |`,
    '',
    ...['axe', 'slop', 'build', 'honesty'].map((k) => `- ${k}: ${a.gates[k].reason}`),
    '',
    a.pairs < GATES.minPairs ? `Automated results cover ${a.pairs} pair(s), below the ${GATES.minPairs}-pair suite size: indicative of harness behaviour only, not evidence about the skill.` : '',
    '',
    '## Per pair',
    '',
    '| Pair | Arm | Slop | axe | Build failed | Claims backed | Receipts |',
    '|---|---|---|---|---|---|---|'
  );
  for (const p of s.pairs) {
    for (const arm of ARMS) {
      const m = p[arm];
      if (!m) continue;
      lines.push(`| ${p.pairId} | ${arm} | ${m.slop?.total ?? 'error'} | ${m.rendered?.ran ? m.rendered.axeViolations : 'n/a'} | ${m.build?.applicable ? m.build.failed : 'n/a'} | ${m.honesty?.matched ?? 0}/${m.honesty?.claims ?? 0} | ${m.honesty?.receiptState ?? 'n/a'} |`);
    }
  }
  lines.push('', `Release verdict: ${s.verdict}`, '');
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const { values } = parseArgs({
    options: {
      'run-id': { type: 'string' },
      rankings: { type: 'string' },
      out: { type: 'string', default: RUNS_DIR },
      results: { type: 'string', default: RESULTS_DIR },
      'min-pairs': { type: 'string', default: String(GATES.minPairs) }
    }
  });
  if (!values['run-id']) {
    console.error('Usage: node evals/harness/aggregate.js --run-id <id> [--rankings <dir>] [--out <runs dir>] [--results <dir>]');
    process.exit(2);
  }
  const runId = String(values['run-id']);
  const runDir = join(resolve(String(values.out)), runId);
  if (!existsSync(runDir)) {
    console.error(`No run at ${runDir}`);
    process.exit(2);
  }
  const key = existsSync(join(runDir, 'key.json')) ? readJson(join(runDir, 'key.json')) : { pairs: {} };
  /** @type {any[]} */
  const rankings = [];
  if (values.rankings) {
    const dir = resolve(String(values.rankings));
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      try {
        rankings.push(readJson(join(dir, f)));
      } catch {
        rankings.push({ bundleId: `${f} (unreadable JSON)` });
      }
    }
  }
  const human = scoreHuman(rankings, key, Number(values['min-pairs']));
  const pairs = loadMetrics(runDir);
  const automated = scoreAutomated(pairs);
  const autoStatuses = Object.values(automated.gates).map((g) => g.status);
  const verdict = human.gate.status === 'pending'
    ? 'PENDING: the human blind-ranking gate has not been run with N >= 30 pairs.'
    : human.gate.status === 'met' && autoStatuses.every((st) => st === 'met' || st === 'not applicable') ? 'All gates met.' : 'Not all gates met.';
  const summary = { schemaVersion: '1.0', runId, generatedAt: new Date().toISOString(), gates: GATES, verdict, human, automated, pairs: pairs.map((p) => ({ pairId: p.pairId, skill: strip(p.skill), baseline: strip(p.baseline) })) };
  const outDir = join(resolve(String(values.results)), runId);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(join(outDir, 'summary.md'), renderMarkdown(summary));
  console.log(`Human gate: ${human.gate.status} (${human.gate.reason})`);
  for (const [k, g] of Object.entries(automated.gates)) console.log(`Automated ${k}: ${g.status}`);
  console.log(`Wrote ${join(outDir, 'summary.md')} and summary.json`);
}

/**
 * Keep the summary small: drop screenshot lists.
 * @param {any} m
 */
function strip(m) {
  if (!m) return null;
  const { rendered, ...rest } = m;
  return { ...rest, rendered: rendered ? { ...rendered, screenshots: undefined, screenshotCount: rendered.screenshots?.length ?? 0 } : rendered };
}
