#!/usr/bin/env node
// Anonymized A/B bundles for blind pairwise ranking (P3).
// For each pair with both arms measured, writes <run>/bundles/<pairId>/ with:
//   A/site/, B/site/   the product files (from <arm>/eval/, no .craft/ or .claude/), with
//                      arm-identifying text redacted
//   A/shots/, B/shots/ the screenshots from the metrics run
//   A/answer.md, B/answer.md  only with --answers: the agent's final answer, redacted. Off by
//                      default because an answer's structure can reveal the arm even when
//                      redacted; without it raters choose tie for Verification honesty.
//   form.html          a static ranking form; answers export as JSON (download or copy)
// The arm order per pair is drawn from a seeded PRNG and recorded only in <run>/key.json,
// which is outside every bundle. After writing, each bundle is scanned for leaks; any leak
// fails the command. No network, no process spawning.
//
// Usage: node evals/harness/bundle.js --run-id <id> [--seed <s>] [--out <runs dir>] [--answers]
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { ARMS, ARM_MARKERS, CODE_MARKERS, BRIEFS_DIR, NON_PRODUCT_DIRS, RUNS_DIR, assignOrder, escapeHtml, listFiles, loadBriefs, redact } from './lib.js';

/** Rubric dimensions in form order (ids are stable keys in the exported JSON). */
export const DIMENSIONS = [
  ['specificity', 'Design specificity'], ['hierarchy', 'Hierarchy'], ['composition', 'Composition'],
  ['consistency', 'Consistency'], ['functionality', 'Functionality'], ['responsiveness', 'Responsiveness'],
  ['accessibility', 'Accessibility'], ['maintainability', 'Maintainability'], ['portability', 'Portability'],
  ['honesty', 'Verification honesty']
];

const TEXT_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.svg', '.vue', '.svelte']);

/**
 * Copy product files with arm-identifying text redacted.
 * @param {string} from
 * @param {string} to
 * @returns {number} redactions
 */
export function copyRedacted(from, to) {
  let redactions = 0;
  for (const f of listFiles(from, NON_PRODUCT_DIRS)) {
    const dest = join(to, f);
    mkdirSync(join(dest, '..'), { recursive: true });
    if (TEXT_EXT.has(extname(f).toLowerCase())) {
      const r = redact(readFileSync(join(from, f), 'utf8'), 'code');
      redactions += r.redactions;
      writeFileSync(dest, r.text);
    } else {
      copyFileSync(join(from, f), dest);
    }
  }
  return redactions;
}

/**
 * Scan a bundle for anything that identifies an arm. Returns problems (empty when clean).
 * @param {string} dir
 * @returns {string[]}
 */
export function scanForLeaks(dir) {
  /** @type {string[]} */
  const problems = [];
  for (const f of listFiles(dir)) {
    const parts = f.split('/');
    if (parts.some((p) => p === '.craft' || p === '.claude')) problems.push(`${f}: tool directory in bundle`);
    if (/\b(skill|baseline)\b/i.test(parts.slice(0, -1).join('/'))) problems.push(`${f}: arm name in path`);
    if (f === 'key.json' || f.endsWith('/key.json')) problems.push(`${f}: key file in bundle`);
    if (!TEXT_EXT.has(extname(f).toLowerCase())) continue;
    const text = readFileSync(join(dir, f), 'utf8');
    for (const re of f.endsWith('answer.md') ? ARM_MARKERS : CODE_MARKERS) {
      re.lastIndex = 0;
      const m = re.exec(text);
      if (m) problems.push(`${f}: contains "${m[0].slice(0, 40)}"`);
    }
  }
  return problems;
}

/**
 * The static ranking form for one bundle. Inline CSS and JS only; no network.
 * @param {{ bundleId: string, briefTitle: string, briefHtml: string, shots: { A: string[], B: string[] }, hasAnswers: boolean, entry: string }} o
 * @returns {string}
 */
export function renderForm(o) {
  const shotList = (/** @type {'A' | 'B'} */ side) => o.shots[side].length
    ? o.shots[side].map((s) => `<li><a href="${side}/shots/${escapeHtml(s)}">${escapeHtml(s)}</a></li>`).join('\n          ')
    : '<li>No screenshots (the page could not be rendered).</li>';
  const preview = (/** @type {'A' | 'B'} */ side) => {
    const first = o.shots[side].find((s) => /-1280\.png$/.test(s)) ?? o.shots[side][0];
    return first ? `<img src="${side}/shots/${escapeHtml(first)}" alt="Output ${side} rendered at desktop width" width="640" loading="lazy">` : '<p>No preview available.</p>';
  };
  const choice = (/** @type {string} */ id, /** @type {string} */ label) => `
      <fieldset class="dim">
        <legend>${escapeHtml(label)}</legend>
        <label><input type="radio" name="${id}" value="A" required> A is better</label>
        <label><input type="radio" name="${id}" value="tie"> Tie or cannot judge</label>
        <label><input type="radio" name="${id}" value="B"> B is better</label>
      </fieldset>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blind ranking: ${escapeHtml(o.bundleId)}</title>
<style>
  :root { --ink: #1b1f24; --muted: #4a525c; --paper: #ffffff; --line: #c9ced4; --focus: #0b57d0; --accent: #0b57d0; --space: 1rem; }
  @media (prefers-color-scheme: dark) { :root { --ink: #e8eaed; --muted: #b6bcc4; --paper: #15181c; --line: #3c434b; --focus: #8ab4f8; --accent: #8ab4f8; } }
  * { box-sizing: border-box; }
  body { margin: 0; font: 1rem/1.5 system-ui, sans-serif; color: var(--ink); background: var(--paper); }
  main { max-width: 72rem; margin: 0 auto; padding: var(--space); }
  h1 { font-size: 1.5rem; margin-block: 0 0.5rem; }
  h2 { font-size: 1.2rem; margin-block: 1.5rem 0.5rem; }
  p, li { max-width: 70ch; }
  .muted { color: var(--muted); }
  .pair { display: grid; gap: var(--space); grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); }
  .pair section { border: 1px solid var(--line); padding: var(--space); min-width: 0; }
  .pair img { max-width: 100%; height: auto; border: 1px solid var(--line); }
  details { border: 1px solid var(--line); padding: 0.5rem var(--space); }
  fieldset.dim { border: 1px solid var(--line); margin-block: 0.75rem; padding: 0.5rem var(--space); }
  fieldset.dim label { display: inline-flex; align-items: center; gap: 0.4rem; margin-inline-end: 1.25rem; min-height: 2.75rem; }
  input, textarea, button { font: inherit; }
  input[type="text"], textarea { width: 100%; padding: 0.5rem; border: 1px solid var(--muted); background: var(--paper); color: var(--ink); }
  button { min-height: 2.75rem; padding: 0.5rem 1rem; border: 2px solid var(--accent); background: var(--paper); color: var(--ink); cursor: pointer; margin-inline-end: 0.5rem; }
  a { color: var(--accent); }
  :focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
  #status { min-height: 1.5rem; }
</style>
</head>
<body>
<main>
  <h1>Blind ranking: ${escapeHtml(o.bundleId)}</h1>
  <p class="muted">Two outputs, A and B, were built from the same brief. You do not know which is which.
  For each rubric dimension, pick the better output, or tie. Use the anchors in the rubric (evals/rubric.md).</p>

  <details>
    <summary>Brief: ${escapeHtml(o.briefTitle)}</summary>
    <div>${o.briefHtml}</div>
  </details>

  <h2>Outputs</h2>
  <div class="pair">
    <section aria-labelledby="out-a">
      <h3 id="out-a">Output A</h3>
      ${preview('A')}
      <p><a href="A/site/${escapeHtml(o.entry)}">Open output A</a> (opens the delivered page)</p>
      <details><summary>All screenshots for A</summary><ul>
          ${shotList('A')}
      </ul></details>
      ${o.hasAnswers ? '<p><a href="A/answer.md">Agent\'s final answer for A</a> (redacted)</p>' : ''}
    </section>
    <section aria-labelledby="out-b">
      <h3 id="out-b">Output B</h3>
      ${preview('B')}
      <p><a href="B/site/${escapeHtml(o.entry)}">Open output B</a> (opens the delivered page)</p>
      <details><summary>All screenshots for B</summary><ul>
          ${shotList('B')}
      </ul></details>
      ${o.hasAnswers ? '<p><a href="B/answer.md">Agent\'s final answer for B</a> (redacted)</p>' : ''}
    </section>
  </div>

  <h2>Your ranking</h2>
  <form id="ranking">
    ${o.hasAnswers ? '<p class="muted">Judge Verification honesty from each agent\'s final answer (linked above) against what you see in the output.</p>' : '<p class="muted">The agents\' final answers are not in this bundle (they can reveal which output is which), so choose tie for Verification honesty; it is measured by the automated honesty audit.</p>'}
    <p><label for="rater">Rater initials (optional)</label>
    <input type="text" id="rater" name="rater" autocomplete="off"></p>
${DIMENSIONS.map(([id, label]) => choice(id, label)).join('\n')}
${choice('overall', 'Overall: which would you ship?')}
    <p><label for="notes">Notes (optional)</label>
    <textarea id="notes" name="notes" rows="3"></textarea></p>
    <button type="submit">Download answers (JSON)</button>
    <button type="button" id="copy">Copy answers</button>
    <p id="status" role="status" aria-live="polite"></p>
    <p><label for="out">Answers JSON</label>
    <textarea id="out" rows="6" readonly></textarea></p>
  </form>
</main>
<script>
  const BUNDLE = ${JSON.stringify(o.bundleId)};
  const DIMS = ${JSON.stringify([...DIMENSIONS.map(([id]) => id), 'overall'])};
  const form = document.getElementById('ranking');
  const status = document.getElementById('status');
  const out = document.getElementById('out');
  function collect() {
    const data = new FormData(form);
    const ratings = {};
    for (const d of DIMS) ratings[d] = data.get(d) || null;
    const missing = DIMS.filter((d) => !ratings[d]);
    const answers = { schemaVersion: '1.0', bundleId: BUNDLE, rater: String(data.get('rater') || ''), ratings, notes: String(data.get('notes') || ''), submittedAt: new Date().toISOString() };
    out.value = JSON.stringify(answers, null, 2);
    return { answers, missing };
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { answers, missing } = collect();
    if (missing.length) { status.textContent = 'Please answer: ' + missing.join(', '); return; }
    const blob = new Blob([JSON.stringify(answers, null, 2) + '\\n'], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ranking-' + BUNDLE + (answers.rater ? '-' + answers.rater.replace(/[^A-Za-z0-9]/g, '') : '') + '.json';
    link.click();
    status.textContent = 'Downloaded ' + link.download + '.';
  });
  document.getElementById('copy').addEventListener('click', async () => {
    const { missing } = collect();
    if (missing.length) { status.textContent = 'Please answer: ' + missing.join(', '); return; }
    try { await navigator.clipboard.writeText(out.value); status.textContent = 'Copied.'; }
    catch { out.select(); status.textContent = 'Copy failed; the answers are selected in the box below.'; }
  });
</script>
</body>
</html>
`;
}

/**
 * Minimal Markdown to HTML for brief text (headings, lists, paragraphs, inline code, bold).
 * @param {string} md
 * @returns {string}
 */
export function briefToHtml(md) {
  const inline = (/** @type {string} */ s) => escapeHtml(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  /** @type {string[]} */
  const out = [];
  let list = '';
  for (const block of md.trim().split(/\n\s*\n/)) {
    const lines = block.split('\n');
    const h = /^(#{1,6})\s+(.*)$/.exec(lines[0]);
    if (h && lines.length === 1) {
      const level = Math.min(6, h[1].length + 1);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^\s*(-|\d+\.)\s/.test(lines[0])) {
      list = /^\s*\d+\./.test(lines[0]) ? 'ol' : 'ul';
      /** @type {string[]} */
      const items = [];
      for (const l of lines) {
        if (/^\s*(-|\d+\.)\s/.test(l)) items.push(l.replace(/^\s*(-|\d+\.)\s+/, ''));
        else items[items.length - 1] += ' ' + l.trim();
      }
      out.push(`<${list}>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list}>`);
      continue;
    }
    out.push(`<p>${inline(lines.join(' '))}</p>`);
  }
  return out.join('\n');
}

/**
 * Build all bundles for a run.
 * @param {string} runDir
 * @param {{ seed: string, answers: boolean, briefsDir?: string }} opts
 * @returns {{ bundles: string[], key: any, leaks: string[] }}
 */
export function buildBundles(runDir, opts) {
  const briefsDir = opts.briefsDir ?? BRIEFS_DIR;
  const briefs = loadBriefs(briefsDir);
  const bundlesDir = join(runDir, 'bundles');
  rmSync(bundlesDir, { recursive: true, force: true });
  mkdirSync(bundlesDir, { recursive: true });
  /** @type {Record<string, { A: string, B: string }>} */
  const pairs = {};
  /** @type {string[]} */
  const bundles = [];
  /** @type {string[]} */
  const leaks = [];
  for (const pairId of readdirSync(runDir).sort()) {
    const brief = briefs.find((b) => b.id === pairId.split('~')[0]);
    if (!brief) continue;
    if (!ARMS.every((arm) => existsSync(join(runDir, pairId, arm, 'eval')))) continue;
    const order = assignOrder(opts.seed, pairId);
    pairs[pairId] = order;
    const dir = join(bundlesDir, pairId);
    /** @type {{ A: string[], B: string[] }} */
    const shots = { A: [], B: [] };
    for (const side of /** @type {const} */ (['A', 'B'])) {
      const armDir = join(runDir, pairId, order[side]);
      copyRedacted(join(armDir, 'eval'), join(dir, side, 'site'));
      const shotDir = join(armDir, 'eval', '.craft', 'reports', 'shots');
      if (existsSync(shotDir)) {
        mkdirSync(join(dir, side, 'shots'), { recursive: true });
        for (const f of readdirSync(shotDir).filter((n) => n.endsWith('.png')).sort()) {
          copyFileSync(join(shotDir, f), join(dir, side, 'shots', f));
          shots[side].push(f);
        }
      }
      if (opts.answers && existsSync(join(armDir, 'final.md'))) {
        writeFileSync(join(dir, side, 'answer.md'), redact(readFileSync(join(armDir, 'final.md'), 'utf8')).text);
      }
    }
    const briefHtml = briefToHtml(readFileSync(join(briefsDir, brief.path), 'utf8'));
    writeFileSync(join(dir, 'form.html'), renderForm({ bundleId: pairId, briefTitle: brief.title, briefHtml, shots, hasAnswers: opts.answers, entry: brief.entry }));
    leaks.push(...scanForLeaks(dir).map((p) => `${pairId}/${p}`));
    bundles.push(pairId);
  }
  const key = { schemaVersion: '1.0', note: 'PRIVATE: do not share with raters. Maps each bundle side to its arm.', seed: opts.seed, createdAt: new Date().toISOString(), pairs };
  writeFileSync(join(runDir, 'key.json'), JSON.stringify(key, null, 2) + '\n');
  return { bundles, key, leaks };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const { values } = parseArgs({
    options: {
      'run-id': { type: 'string' },
      seed: { type: 'string' },
      out: { type: 'string', default: RUNS_DIR },
      answers: { type: 'boolean', default: false },
      'briefs-dir': { type: 'string' }
    }
  });
  if (!values['run-id']) {
    console.error('Usage: node evals/harness/bundle.js --run-id <id> [--seed <s>] [--out <runs dir>] [--answers]');
    process.exit(2);
  }
  const runDir = join(resolve(String(values.out)), String(values['run-id']));
  const seed = values.seed ?? randomBytes(8).toString('hex');
  const r = buildBundles(runDir, { seed, answers: Boolean(values.answers), briefsDir: values['briefs-dir'] ? resolve(values['briefs-dir']) : undefined });
  if (r.leaks.length) {
    console.error(`Arm-identifying content found in bundles; do not hand these to raters:\n  ${r.leaks.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Wrote ${r.bundles.length} bundle(s) to ${join(runDir, 'bundles')} (seed recorded in ${join(runDir, 'key.json')}, which stays private).`);
  console.log('Hand each bundles/<pair>/ folder to a rater; they open form.html and return the downloaded JSON.');
  console.log(`Then: node evals/harness/aggregate.js --run-id ${values['run-id']} --rankings <dir of returned JSON files>`);
}
