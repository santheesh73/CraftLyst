#!/usr/bin/env node
// Local ranking app for the blind pairwise ranking (P3). Serves an unzipped bundles/ folder on
// 127.0.0.1, shows progress, opens the next unranked pair, and saves each submitted form
// straight into the answers folder, so a rater never handles 36 downloads. Nothing in the
// bundles reveals the arm, and this server never reads key.json. No network beyond loopback,
// no process spawning.
//
// Usage: node evals/harness/rank.js --bundles <dir> [--answers <dir>] [--rater <initials>]
//          [--port 4417]
// Then: node evals/harness/aggregate.js --run-id <id> --rankings <answers dir>
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { escapeHtml } from './lib.js';
import { DIMENSIONS } from './bundle.js';

const DIM_IDS = [...DIMENSIONS.map(([id]) => id), 'overall'];
const TYPES = /** @type {Record<string, string>} */ ({
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json'
});

/** @param {string} s */
const safeRater = (s) => s.replace(/[^A-Za-z0-9]/g, '').slice(0, 12);

/**
 * Bundle ids in a stable order that differs per rater, so raters do not all see the
 * repeats of one brief back to back in the same order.
 * @param {string} bundlesDir
 * @param {string} rater
 * @returns {string[]}
 */
export function bundleOrder(bundlesDir, rater) {
  const ids = readdirSync(bundlesDir).filter((d) => existsSync(join(bundlesDir, d, 'form.html')));
  const h = (/** @type {string} */ id) => createHash('sha256').update(`${rater}\0${id}`).digest('hex');
  return ids.sort((a, b) => h(a).localeCompare(h(b)));
}

/**
 * @param {string} answersDir
 * @param {string} bundleId
 * @param {string} rater
 */
export const answerFile = (answersDir, bundleId, rater) => join(answersDir, `ranking-${bundleId}${rater ? `-${rater}` : ''}.json`);

/**
 * Validate a submitted answer against the known bundles and the rubric dimensions.
 * @param {any} a
 * @param {Set<string>} known
 * @returns {string | null} problem, or null when valid
 */
export function checkAnswer(a, known) {
  if (!a || typeof a !== 'object') return 'not a JSON object';
  if (!known.has(a.bundleId)) return `unknown bundle "${a.bundleId}"`;
  const missing = DIM_IDS.filter((d) => !['A', 'B', 'tie'].includes(a.ratings?.[d]));
  return missing.length ? `missing or invalid: ${missing.join(', ')}` : null;
}

/** Injected into each form.html: submit saves to the server, then moves to the next pair. */
const INJECT = `<script>
(() => {
  const form = document.getElementById('ranking');
  const status = document.getElementById('status');
  const DIMS = ${JSON.stringify(DIM_IDS)};
  const rater = document.getElementById('rater');
  if (rater && !rater.value) rater.value = new URLSearchParams(location.search).get('rater') || '';
  const btn = form.querySelector('button[type=submit]');
  if (btn) btn.textContent = 'Save and go to the next pair';
  window.addEventListener('submit', async (event) => {
    if (event.target !== form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const data = new FormData(form);
    const ratings = {};
    for (const d of DIMS) ratings[d] = data.get(d) || null;
    const missing = DIMS.filter((d) => !ratings[d]);
    if (missing.length) { status.textContent = 'Please answer: ' + missing.join(', '); return; }
    const answers = { schemaVersion: '1.0', bundleId: decodeURIComponent(location.pathname.split('/')[2]), rater: String(data.get('rater') || ''), ratings, notes: String(data.get('notes') || ''), submittedAt: new Date().toISOString() };
    const res = await fetch('/api/answers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(answers) });
    if (!res.ok) { status.textContent = 'Not saved: ' + await res.text(); return; }
    location.href = '/next' + (answers.rater ? '?rater=' + encodeURIComponent(answers.rater) : '');
  }, true);
})();
</script>
<p style="margin:1rem"><a href="/">All pairs and progress</a></p>
`;

/**
 * @param {{ bundles: string, answers: string, rater?: string }} opts
 * @returns {import('node:http').Server}
 */
export function createRankServer(opts) {
  const bundlesDir = resolve(opts.bundles);
  const answersDir = resolve(opts.answers);
  mkdirSync(answersDir, { recursive: true });
  const defaultRater = safeRater(opts.rater ?? '');

  /** @param {string} rater */
  const progress = (rater) => {
    const order = bundleOrder(bundlesDir, rater);
    return order.map((id) => ({ id, done: existsSync(answerFile(answersDir, id, rater)) }));
  };

  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const rater = safeRater(url.searchParams.get('rater') ?? defaultRater);
    const q = rater ? `?rater=${encodeURIComponent(rater)}` : '';
    /** @param {number} code @param {string} body @param {string} [type] */
    const send = (code, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };

    if (req.method === 'POST' && url.pathname === '/api/answers') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 100_000) req.destroy(); });
      req.on('end', () => {
        /** @type {any} */
        let a;
        try { a = JSON.parse(body); } catch { return send(400, 'invalid JSON'); }
        const known = new Set(bundleOrder(bundlesDir, ''));
        const problem = checkAnswer(a, known);
        if (problem) return send(400, problem);
        const r = safeRater(String(a.rater ?? ''));
        const clean = { schemaVersion: '1.0', bundleId: a.bundleId, rater: r, ratings: Object.fromEntries(DIM_IDS.map((d) => [d, a.ratings[d]])), notes: String(a.notes ?? '').slice(0, 5000), submittedAt: new Date().toISOString() };
        writeFileSync(answerFile(answersDir, a.bundleId, r), JSON.stringify(clean, null, 2) + '\n');
        send(200, 'saved');
      });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'method not allowed');

    if (url.pathname === '/next') {
      const next = progress(rater).find((p) => !p.done);
      res.writeHead(302, { location: next ? `/b/${encodeURIComponent(next.id)}/form.html${q}` : `/${q}` });
      return res.end();
    }

    if (url.pathname === '/') {
      const items = progress(rater);
      const done = items.filter((p) => p.done).length;
      const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blind ranking</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1d1d1b;background:#fbfaf6}
a{color:#174ea6}li{margin:.25rem 0}.done{color:#55524a}.go{display:inline-block;padding:.6rem 1rem;background:#174ea6;color:#fff;border-radius:6px;text-decoration:none}
@media (prefers-color-scheme: dark){body{background:#151513;color:#ecebe6}a{color:#9cc0ff}.done{color:#b4b1a8}.go{background:#9cc0ff;color:#151513}}</style></head>
<body><main>
<h1>Blind ranking</h1>
<p>Rater: <strong>${escapeHtml(rater || '(none)')}</strong>. ${done} of ${items.length} pairs ranked. Answers are saved to <code>${escapeHtml(answersDir)}</code>.</p>
<p>For each pair, compare A and B on every dimension and pick A, B, or tie. Choose tie when you cannot judge. The anchors are in the rubric; each pair takes about 3 to 5 minutes. You can stop at any time and come back: progress is kept.</p>
${done < items.length ? `<p><a class="go" href="/next${q}">${done ? 'Continue with the next pair' : 'Start ranking'}</a></p>` : `<p><strong>All pairs are ranked.</strong> Stop the server (Ctrl+C), then run:</p><pre>node evals/harness/aggregate.js --run-id &lt;run id&gt; --rankings ${escapeHtml(answersDir)}</pre>`}
<ol>${items.map((p) => `<li class="${p.done ? 'done' : ''}"><a href="/b/${encodeURIComponent(p.id)}/form.html${q}">Pair ${items.indexOf(p) + 1}</a>${p.done ? ' (ranked, open to change)' : ''}</li>`).join('')}</ol>
</main></body></html>`;
      return send(200, html, TYPES['.html']);
    }

    if (url.pathname.startsWith('/b/')) {
      let rel;
      try { rel = decodeURIComponent(url.pathname.slice(3)); } catch { return send(400, 'bad path'); }
      const file = resolve(bundlesDir, rel);
      if (!file.startsWith(bundlesDir + sep) || rel.split('/').includes('..')) return send(403, 'forbidden');
      let target = file;
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
      if (!existsSync(target) || !statSync(target).isFile()) return send(404, 'not found');
      const ext = extname(target).toLowerCase();
      if (/\/form\.html$/.test(url.pathname) && rel.split('/').length === 2) {
        const html = readFileSync(target, 'utf8');
        return send(200, html.includes('</body>') ? html.replace('</body>', `${INJECT}</body>`) : html + INJECT, TYPES['.html']);
      }
      res.writeHead(200, { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      return res.end(req.method === 'HEAD' ? undefined : readFileSync(target));
    }
    send(404, 'not found');
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { values } = parseArgs({
    options: {
      bundles: { type: 'string' },
      answers: { type: 'string', default: join(homedir(), 'p3-rankings') },
      rater: { type: 'string', default: '' },
      port: { type: 'string', default: '4417' }
    }
  });
  if (!values.bundles || !existsSync(String(values.bundles))) {
    console.error('Usage: node evals/harness/rank.js --bundles <unzipped bundles dir> [--answers <dir>] [--rater <initials>] [--port 4417]');
    process.exit(2);
  }
  const bundles = resolve(String(values.bundles));
  const count = bundleOrder(bundles, '').length;
  if (!count) {
    console.error(`No bundles with form.html found in ${bundles}. Point --bundles at the folder that contains the pair folders.`);
    process.exit(2);
  }
  const server = createRankServer({ bundles, answers: String(values.answers), rater: String(values.rater) });
  server.listen(Number(values.port), '127.0.0.1', () => {
    const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
    const r = safeRater(String(values.rater));
    console.log(`${count} pairs. Open http://127.0.0.1:${addr.port}/${r ? `?rater=${r}` : ''} in your browser.`);
    console.log(`Answers are saved to ${resolve(String(values.answers))}. Stop with Ctrl+C; progress is kept.`);
  });
}
