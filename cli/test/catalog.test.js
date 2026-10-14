import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main, EXIT } from '../src/cli.js';
import {
  BUNDLED_CATALOG, loadCatalog, validateCatalog, buildIndex, serializeIndex, search, clampLimit, parseFilters, tokenize, stem
} from '../src/catalog.js';

/** @param {string[]} args */
async function run(args) {
  let stdout = '';
  let stderr = '';
  const code = await main(args, { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } });
  return { code, stdout, stderr, json: () => JSON.parse(stdout) };
}

const tmp = () => mkdtempSync(join(tmpdir(), 'craft-catalog-'));
const TODAY = '2026-10-14';

/** A valid L1 original spec; override fields per test. */
function entry(over = {}) {
  return {
    schemaVersion: '1.0',
    id: 'sample-entry',
    title: 'Sample sortable table',
    category: 'component',
    description: 'A sample entry used by tests: a sortable table with a filter toolbar.',
    intent: 'Exercise validation rules in tests.',
    tags: ['table', 'sort'],
    source: { kind: 'original-spec', url: null, attribution: 'Frontend Craft contributors' },
    characteristics: ['sortable headers'],
    axes: { density: ['compact'] },
    compatibility: { frameworks: ['any'], styling: ['any'] },
    dependencies: [],
    license: { name: 'CC-BY-4.0', spdx: 'CC-BY-4.0', redistribution: 'attribution-required' },
    trust: 'L1',
    verified_on: '2026-10-01',
    status: 'reviewed',
    limitations: ['Test only.'],
    ...over
  };
}

/**
 * @param {Record<string, any>[]} entries
 * @returns {string} catalog root
 */
function catalogWith(entries) {
  const root = tmp();
  mkdirSync(join(root, 'entries'));
  for (const e of entries) writeFileSync(join(root, 'entries', `${e.id}.json`), JSON.stringify(e));
  return root;
}

/** @param {Record<string, any>[]} entries @param {string} [today] */
function rulesFor(entries, today = TODAY) {
  const r = validateCatalog(loadCatalog({ catalogRoot: catalogWith(entries) }), { today });
  return { errors: r.errors.map((e) => e.rule), warnings: r.warnings.map((w) => w.rule) };
}

test('bundled catalog: 30 entries, all valid, ids match file names', () => {
  const loaded = loadCatalog();
  assert.equal(loaded.length, 30);
  const r = validateCatalog(loaded, { today: TODAY });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  const categories = new Set(loaded.map((l) => l.entry?.category));
  assert.deepEqual([...categories].sort(), ['component', 'design-system', 'motion', 'page-composition', 'specialized-product']);
});

test('valid entry passes; schema and id/file problems are errors', () => {
  assert.deepEqual(rulesFor([entry()]).errors, []);
  assert.deepEqual(rulesFor([entry({ trust: 'L9' })]).errors, ['schema']);
  const root = catalogWith([]);
  writeFileSync(join(root, 'entries', 'other-name.json'), JSON.stringify(entry()));
  writeFileSync(join(root, 'entries', 'broken.json'), '{ nope');
  const r = validateCatalog(loadCatalog({ catalogRoot: root }), { today: TODAY });
  assert.deepEqual(r.errors.map((e) => e.rule).sort(), ['id-file', 'json']);
});

test('ids must be unique across bundled and local entries', () => {
  const project = tmp();
  mkdirSync(join(project, '.craft', 'catalog'), { recursive: true });
  writeFileSync(join(project, '.craft', 'catalog', 'sample-entry.json'), JSON.stringify(entry()));
  const r = validateCatalog(loadCatalog({ catalogRoot: catalogWith([entry()]), projectRoot: project }), { today: TODAY });
  assert.deepEqual(r.errors.map((e) => e.rule), ['id-unique']);
});

test('L3 and tested require evidence; L3 requires status tested', () => {
  assert.deepEqual(rulesFor([entry({ trust: 'L3', status: 'reviewed' })]).errors, ['l3-evidence']);
  assert.deepEqual(rulesFor([entry({ trust: 'L3', status: 'tested', evidence: [] })]).errors.sort(), ['l3-evidence', 'tested-evidence']);
  assert.deepEqual(rulesFor([entry({ status: 'tested' })]).errors, ['tested-evidence']);
  assert.deepEqual(rulesFor([entry({ trust: 'L3', status: 'tested', evidence: ['evals/catalog/sample-entry.md'] })]).errors, []);
});

test('deprecation needs a note and a live replacement', () => {
  const live = entry({ id: 'live-entry' });
  assert.deepEqual(rulesFor([entry({ status: 'deprecated' }), live]).errors, ['deprecation']);
  assert.deepEqual(rulesFor([entry({ status: 'deprecated', deprecation: { note: 'Replaced by live-entry in 0.4.', replacement: null } }), live]).errors, ['deprecation']);
  assert.deepEqual(rulesFor([entry({ status: 'deprecated', deprecation: { note: 'Replaced by missing in 0.4.', replacement: 'missing' } }), live]).errors, ['deprecation']);
  assert.deepEqual(rulesFor([entry({ status: 'deprecated', deprecation: { note: 'Replaced by live-entry in 0.4.', replacement: 'live-entry' } }), live]).errors, []);
  assert.deepEqual(rulesFor([entry({ deprecation: { note: 'Not actually deprecated.', replacement: 'live-entry' } }), live]).errors, ['deprecation']);
});

test('link-only, unknown redistribution, and unverified entries must be draft and not L2/L3', () => {
  const linkOnly = { kind: 'link-only', url: 'https://example.com/pattern', attribution: 'Example' };
  assert.deepEqual(rulesFor([entry({ source: linkOnly, trust: 'L0', status: 'reviewed' })]).errors, ['unclear-provenance']);
  assert.deepEqual(rulesFor([entry({ source: linkOnly, trust: 'L0', status: 'draft' })]).errors, []);
  assert.deepEqual(rulesFor([entry({ license: { name: '?', spdx: null, redistribution: 'unknown' }, status: 'draft', trust: 'L2', source: { kind: 'first-party-oss', url: 'https://example.com/x', attribution: 'X' } })]).errors.sort(), ['license-allowlist', 'license-allowlist', 'unclear-provenance']);
  assert.deepEqual(rulesFor([entry({ verified_on: null })]).errors, ['unverified']);
  assert.deepEqual(rulesFor([entry({ verified_on: null, status: 'draft' })]).errors, []);
});

test('L0 must be a reference without code; galleries are L0 only', () => {
  assert.deepEqual(rulesFor([entry({ trust: 'L0', status: 'draft' })]).errors, ['l0-source']);
  const gallery = { kind: 'gallery-reference', url: 'https://example.com/gallery', attribution: 'Example gallery' };
  assert.deepEqual(rulesFor([entry({ trust: 'L0', source: gallery, dependencies: [{ name: 'x', range: '^1.0.0' }] })]).errors, ['l0-code']);
  assert.deepEqual(rulesFor([entry({ trust: 'L1', source: gallery })]).errors, ['gallery']);
  assert.deepEqual(rulesFor([entry({ trust: 'L0', source: gallery })]).errors, []);
});

test('bundled third-party code must use an allowlisted SPDX id', () => {
  const oss = { kind: 'first-party-oss', url: 'https://example.com/repo', attribution: 'Example authors' };
  assert.deepEqual(rulesFor([entry({ trust: 'L2', source: oss, license: { name: 'GPL', spdx: 'GPL-3.0-only', redistribution: 'allowed' } })]).errors, ['license-allowlist']);
  assert.deepEqual(rulesFor([entry({ trust: 'L2', source: oss, license: { name: 'MIT', spdx: 'MIT', redistribution: 'attribution-required' } })]).errors, []);
  assert.deepEqual(rulesFor([entry({ trust: 'L2', source: { ...oss, url: null }, license: { name: 'MIT', spdx: 'MIT', redistribution: 'allowed' } })]).errors, ['source-url']);
});

test('"production-ready" is forbidden unless L3', () => {
  assert.deepEqual(rulesFor([entry({ description: 'A production-ready table component for every app you build.' })]).errors, ['production-ready']);
  assert.deepEqual(rulesFor([entry({ limitations: ['Not production ready yet.'] })]).errors, ['production-ready']);
});

test('verified_on older than 12 months warns; future dates are errors; --today makes it deterministic', () => {
  assert.deepEqual(rulesFor([entry({ verified_on: '2025-10-14' })], '2026-10-14'), { errors: [], warnings: [] });
  assert.deepEqual(rulesFor([entry({ verified_on: '2025-10-13' })], '2026-10-14'), { errors: [], warnings: ['stale'] });
  assert.deepEqual(rulesFor([entry({ verified_on: '2026-10-15' })], '2026-10-14').errors, ['verified-future']);
});

test('craft catalog validate: exit codes, JSON, --today, --fail-on warn', async () => {
  const ok = await run(['catalog', 'validate', '--json', '--today', TODAY]);
  assert.equal(ok.code, EXIT.OK, ok.stdout);
  assert.equal(ok.json().entries, 30);
  assert.deepEqual(ok.json().errors, []);

  const bad = catalogWith([entry({ trust: 'L3' })]);
  const r = await run(['catalog', 'validate', '--catalog', bad, '--json', '--today', TODAY]);
  assert.equal(r.code, EXIT.FINDINGS);
  assert.equal(r.json().errors[0].rule, 'l3-evidence');
  assert.ok(r.json().errors[0].remediation);

  const stale = catalogWith([entry({ verified_on: '2024-01-01' })]);
  assert.equal((await run(['catalog', 'validate', '--catalog', stale, '--today', TODAY])).code, EXIT.OK);
  assert.equal((await run(['catalog', 'validate', '--catalog', stale, '--today', TODAY, '--fail-on', 'warn'])).code, EXIT.FINDINGS);

  assert.equal((await run(['catalog'])).code, EXIT.USAGE);
  assert.equal((await run(['catalog', 'validate', '--today', '14/10/2026'])).code, EXIT.USAGE);
  assert.equal((await run(['catalog', 'validate', '--catalog', tmp()])).code, EXIT.UNAVAILABLE);
});

test('tokenizer and stemmer are simple and deterministic', () => {
  assert.deepEqual(tokenize('Sorting the Tables, with filters!'), ['sort', 'table', 'filter']);
  assert.equal(stem('categories'), 'category');
  assert.equal(stem('class'), 'class');
});

test('index build is deterministic and the committed index is current', () => {
  const { valid } = validateCatalog(loadCatalog(), { today: TODAY });
  const a = serializeIndex(buildIndex(valid));
  const b = serializeIndex(buildIndex([...valid].reverse()));
  assert.equal(a, b);
  assert.equal(readFileSync(join(BUNDLED_CATALOG, 'index', 'index.json'), 'utf8'), a, 'run node scripts/build-index.js');
  const idx = JSON.parse(a);
  assert.equal(idx.entryCount, 30);
  assert.ok(!/"(builtAt|generatedAt|timestamp)"/.test(a), 'no timestamps in the index');
});

test('search ranks by relevance and returns compact cards only', () => {
  const index = JSON.parse(readFileSync(join(BUNDLED_CATALOG, 'index', 'index.json'), 'utf8'));
  const r = search(index, 'sortable data table with bulk actions');
  assert.equal(r.results[0].id, 'data-table-sort-filter');
  assert.equal(r.results.length, 5);
  assert.deepEqual(Object.keys(r.results[0]).sort(), ['category', 'id', 'intent', 'origin', 'path', 'score', 'status', 'title', 'trust']);
  assert.deepEqual(search(index, 'sortable data table with bulk actions'), r, 'same query, same output');
  for (let i = 1; i < r.results.length; i++) assert.ok(r.results[i - 1].score >= r.results[i].score);
});

test('search filters: trust, category, axes, stack, limit clamp', () => {
  const index = JSON.parse(readFileSync(join(BUNDLED_CATALOG, 'index', 'index.json'), 'utf8'));
  assert.deepEqual(search(index, 'table', { trust: ['L2'] }).results, []);
  assert.ok(search(index, 'table', { category: ['component'] }).results.every((x) => x.category === 'component'));
  const dense = search(index, 'layout page', { axes: { density: 'airy' }, limit: 10 });
  for (const x of dense.results) {
    const fit = index.docs.find((/** @type {any} */ d) => d.id === x.id).axes.density;
    assert.ok(!fit || fit.includes('airy'), x.id);
  }
  assert.ok(dense.filteredOut > 0);
  assert.equal(search(index, 'table', { limit: 50 }).results.length <= 10, true);
  assert.equal(clampLimit(0), 1);
  assert.equal(clampLimit(99), 10);
  assert.equal(clampLimit(undefined), 5);
  const stack = parseFilters({ stack: 'react,tailwind-v4', trust: 'l1', limit: '3' });
  assert.deepEqual(stack, { filters: { frameworks: ['react'], styling: ['tailwind-v4'], trust: ['L1'], limit: 3 } });
  assert.ok('error' in parseFilters({ stack: 'angular' }));
  assert.ok('error' in parseFilters({ axes: 'density' }));
  assert.ok('error' in parseFilters({ axes: 'mood=calm' }));
  assert.ok('error' in parseFilters({ category: 'widgets' }));
  assert.ok('error' in parseFilters({ limit: 'many' }));
});

test('stack filter: "any" entries match every stack; specific stacks must match', () => {
  const root = catalogWith([
    entry({ id: 'vue-only', title: 'Vue only table', compatibility: { frameworks: ['vue'], styling: ['css'] } }),
    entry({ id: 'any-stack', title: 'Any stack table' })
  ]);
  const { valid } = validateCatalog(loadCatalog({ catalogRoot: root }), { today: TODAY });
  const index = JSON.parse(serializeIndex(buildIndex(valid)));
  assert.deepEqual(search(index, 'table', { frameworks: ['react'] }).results.map((x) => x.id), ['any-stack']);
  assert.deepEqual(search(index, 'table', { frameworks: ['vue'], styling: ['css'] }).results.map((x) => x.id).sort(), ['any-stack', 'vue-only']);
  assert.deepEqual(search(index, 'table', { frameworks: ['vue'], styling: ['tailwind-v4'] }).results.map((x) => x.id), ['any-stack']);
});

test('craft search: JSON cards, limit clamp, usage errors, no index exits 3', async () => {
  const r = await run(['search', 'command palette keyboard', '--json', '--limit', '3']);
  assert.equal(r.code, EXIT.OK, r.stderr);
  const j = r.json();
  assert.equal(j.results.length, 3);
  assert.equal(j.results[0].id, 'command-palette');
  assert.ok(existsSync(j.results[0].file));
  assert.equal(j.index.origin, 'bundled');
  assert.ok(!('description' in j.results[0]) && !('characteristics' in j.results[0]), 'cards, not full entries');
  assert.equal((await run(['search', 'page layout with navigation', '--json', '--limit', '40'])).json().results.length, 10);

  assert.equal((await run(['search'])).code, EXIT.USAGE);
  assert.equal((await run(['search', 'x', '--trust', 'L7'])).code, EXIT.USAGE);
  const none = await run(['search', 'table', '--catalog', tmp(), '--cwd', tmp(), '--json']);
  assert.equal(none.code, EXIT.UNAVAILABLE);
  assert.match(none.json().message, /craft index build/);
});

test('craft index build writes only .craft/catalog-index.json and includes local entries', async () => {
  const project = tmp();
  mkdirSync(join(project, '.craft', 'catalog'), { recursive: true });
  writeFileSync(join(project, '.craft', 'catalog', 'house-ledger-table.json'), JSON.stringify(entry({ id: 'house-ledger-table', title: 'House ledger reconciliation table', tags: ['ledger', 'reconciliation'] })));
  const b = await run(['index', 'build', '--cwd', project, '--json']);
  assert.equal(b.code, EXIT.OK, b.stdout + b.stderr);
  assert.equal(b.json().entries, 31);
  assert.deepEqual(readdirSync(project), ['.craft']);
  assert.deepEqual(readdirSync(join(project, '.craft')).sort(), ['catalog', 'catalog-index.json']);

  const s = (await run(['search', 'ledger reconciliation', '--cwd', project, '--json'])).json();
  assert.equal(s.index.origin, 'local');
  assert.equal(s.index.stale, false);
  assert.equal(s.results[0].id, 'house-ledger-table');
  assert.equal(s.results[0].file, join(project, '.craft', 'catalog', 'house-ledger-table.json'));

  writeFileSync(join(project, '.craft', 'catalog', 'broken-entry.json'), JSON.stringify(entry({ id: 'broken-entry', trust: 'L3' })));
  const bad = await run(['index', 'build', '--cwd', project, '--json']);
  assert.equal(bad.code, EXIT.FINDINGS);
  assert.equal(bad.json().entries, 31, 'invalid entries are left out');
  assert.equal((await run(['index'])).code, EXIT.USAGE);
});
