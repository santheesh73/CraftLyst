// The local ranking app: progress, next-pair redirect, saved answers, validation, and path safety.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRankServer, bundleOrder, checkAnswer } from '../harness/rank.js';
import { renderForm, DIMENSIONS } from '../harness/bundle.js';
import { resolveFrom } from '../../cli/src/shoot.js';

const DIMS = [...DIMENSIONS.map(([id]) => id), 'overall'];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'craft-rank-'));
  const bundles = join(root, 'bundles');
  for (const id of ['01-a', '01-a~r2', '02-b']) {
    mkdirSync(join(bundles, id, 'A', 'site'), { recursive: true });
    mkdirSync(join(bundles, id, 'B', 'site'), { recursive: true });
    writeFileSync(join(bundles, id, 'A', 'site', 'index.html'), '<!doctype html><title>A</title><p>A</p>');
    writeFileSync(join(bundles, id, 'B', 'site', 'index.html'), '<!doctype html><title>B</title><p>B</p>');
    writeFileSync(join(bundles, id, 'form.html'), renderForm({ bundleId: id, briefTitle: 'Brief', briefHtml: '<p>Brief</p>', shots: { A: [], B: [] }, hasAnswers: false, entry: 'index.html' }));
  }
  writeFileSync(join(root, 'key.json'), '{"secret":true}');
  return { root, bundles, answers: join(root, 'answers') };
}

/** @param {import('node:http').Server} server @returns {Promise<string>} */
const listen = (server) => new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${/** @type {import('node:net').AddressInfo} */ (server.address()).port}`)));

const answer = (/** @type {string} */ bundleId, /** @type {string} */ rater) => ({ bundleId, rater, ratings: Object.fromEntries(DIMS.map((d) => [d, 'tie'])), notes: '' });

test('order is stable per rater and covers every bundle', () => {
  const { bundles } = fixture();
  assert.deepEqual(bundleOrder(bundles, 'sk'), bundleOrder(bundles, 'sk'));
  assert.deepEqual([...bundleOrder(bundles, 'sk')].sort(), ['01-a', '01-a~r2', '02-b']);
});

test('checkAnswer rejects unknown bundles and incomplete ratings', () => {
  const known = new Set(['01-a']);
  assert.equal(checkAnswer(answer('01-a', ''), known), null);
  assert.match(String(checkAnswer(answer('zz', ''), known)), /unknown bundle/);
  assert.match(String(checkAnswer({ ...answer('01-a', ''), ratings: { overall: 'A' } }, known)), /missing or invalid: specificity/);
});

test('server: progress page, next redirect, saved answers, and no access outside the bundles', async () => {
  const f = fixture();
  const server = createRankServer({ bundles: f.bundles, answers: f.answers, rater: 'sk' });
  const base = await listen(server);
  try {
    let home = await (await fetch(`${base}/`)).text();
    assert.match(home, /0 of 3 pairs ranked/);

    const first = bundleOrder(f.bundles, 'sk')[0];
    const next = await fetch(`${base}/next?rater=sk`, { redirect: 'manual' });
    assert.equal(next.status, 302);
    assert.equal(next.headers.get('location'), `/b/${encodeURIComponent(first)}/form.html?rater=sk`);

    const form = await (await fetch(`${base}${next.headers.get('location')}`)).text();
    assert.match(form, /Save and go to the next pair/);
    assert.match(form, /\/api\/answers/);
    assert.equal((await fetch(`${base}/b/${encodeURIComponent(first)}/A/site/index.html`)).status, 200);

    assert.equal((await fetch(`${base}/api/answers`, { method: 'POST', body: JSON.stringify({ ...answer(first, 'sk'), ratings: {} }) })).status, 400);
    assert.equal((await fetch(`${base}/api/answers`, { method: 'POST', body: JSON.stringify(answer(first, 'sk')) })).status, 200);
    const saved = JSON.parse(readFileSync(join(f.answers, `ranking-${first}-sk.json`), 'utf8'));
    assert.equal(saved.bundleId, first);
    assert.equal(saved.ratings.overall, 'tie');

    home = await (await fetch(`${base}/?rater=sk`)).text();
    assert.match(home, /1 of 3 pairs ranked/);
    const second = await fetch(`${base}/next?rater=sk`, { redirect: 'manual' });
    assert.notEqual(second.headers.get('location'), next.headers.get('location'));

    for (const p of ['/b/../key.json', '/b/%2e%2e/key.json', '/b/..%2fkey.json', '/key.json']) {
      const r = await fetch(`${base}${p}`);
      assert.ok([403, 404].includes(r.status), `${p} -> ${r.status}`);
      assert.doesNotMatch(await r.text(), /secret/);
    }
  } finally {
    server.close();
  }
});

async function browserMissing() {
  if (!resolveFrom(process.cwd(), 'playwright')) return 'playwright is not installed';
  try {
    const { chromium } = await import('playwright');
    await (await chromium.launch()).close();
    return false;
  } catch (err) {
    return `Chromium is not installed: ${String(/** @type {Error} */ (err).message).split('\n')[0]}`;
  }
}

test('in a browser, submitting a form saves it and opens the next pair', { skip: await browserMissing() }, async () => {
  const f = fixture();
  const server = createRankServer({ bundles: f.bundles, answers: f.answers, rater: 'qa' });
  const base = await listen(server);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/next?rater=qa`);
    const firstUrl = page.url();
    assert.equal(await page.inputValue('#rater'), 'qa');
    for (const d of DIMS) await page.check(`input[name="${d}"][value="tie"]`);
    await Promise.all([page.waitForURL((u) => u.href !== firstUrl), page.click('button[type=submit]')]);
    assert.equal(readdirSync(f.answers).length, 1);
    assert.ok(existsSync(join(f.answers, `ranking-${bundleOrder(f.bundles, 'qa')[0]}-qa.json`)));
    assert.match(page.url(), new RegExp(`/b/${encodeURIComponent(bundleOrder(f.bundles, 'qa')[1]).replace(/[~.]/g, '\\$&')}/form.html`));
  } finally {
    await browser.close();
    server.close();
  }
});
