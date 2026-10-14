// Pattern catalog: loading, validation (schema + cross-field rules), the offline lexical
// index, and search. Index format and search semantics: docs/decisions/0014.
// Read-only except buildLocalIndex's caller, which writes .craft/catalog-index.json.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { validateAgainst } from './schemas.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Catalog root shipped with the CLI: <repo or package>/catalog. */
export const BUNDLED_CATALOG = join(here, '..', '..', 'catalog');
/** Project-local entries and index, relative to the project root. */
export const LOCAL_ENTRIES_DIR = '.craft/catalog';
export const LOCAL_INDEX_FILE = '.craft/catalog-index.json';
/** Shipped index, relative to the catalog root. */
export const SHIPPED_INDEX_FILE = 'index/index.json';

/** SPDX ids whose code may be bundled (NOTICE.md, docs/licensing.md). */
export const SPDX_ALLOWLIST = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD'];
export const TRUST_LEVELS = ['L0', 'L1', 'L2', 'L3'];
export const CATEGORIES = ['page-composition', 'component', 'motion', 'specialized-product', 'design-system'];
export const FRAMEWORKS = ['any', 'react', 'next', 'vue', 'svelte', 'astro', 'html'];
export const STYLING = ['any', 'css', 'tailwind-v3', 'tailwind-v4', 'css-modules', 'scss', 'css-in-js'];
export const STALE_AFTER_MONTHS = 12;
export const INDEX_SCHEMA_VERSION = '1';

/** Field weights for BM25F-style scoring (ADR-0014). */
export const FIELD_WEIGHTS = { title: 3, tags: 2.5, intent: 2, characteristics: 1.5, description: 1, category: 1, notes: 0.5 };
export const BM25 = { k1: 1.2, b: 0.75 };

/**
 * @typedef {Record<string, any>} Entry
 * @typedef {{ entry: Entry | null, file: string, path: string, origin: 'bundled' | 'local', parseError?: string }} LoadedEntry
 * @typedef {{ id: string, file: string, rule: string, message: string, remediation: string }} Problem
 */

/**
 * Loads every *.json in a directory, sorted by file name. Unparseable files are returned with parseError.
 * @param {string} dir absolute directory
 * @param {'bundled' | 'local'} origin
 * @param {string} pathPrefix prefix for the stored relative path
 * @returns {LoadedEntry[]}
 */
export function loadEntries(dir, origin, pathPrefix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const file = join(dir, f);
    const path = `${pathPrefix}/${f}`;
    try {
      return { entry: JSON.parse(readFileSync(file, 'utf8')), file, path, origin };
    } catch (err) {
      return { entry: null, file, path, origin, parseError: /** @type {Error} */ (err).message };
    }
  });
}

/**
 * Bundled entries from <catalogRoot>/entries plus project-local entries from <projectRoot>/.craft/catalog.
 * @param {{ catalogRoot?: string, projectRoot?: string }} opts
 * @returns {LoadedEntry[]}
 */
export function loadCatalog({ catalogRoot = BUNDLED_CATALOG, projectRoot } = {}) {
  const bundled = loadEntries(join(catalogRoot, 'entries'), 'bundled', 'entries');
  const local = projectRoot ? loadEntries(join(projectRoot, LOCAL_ENTRIES_DIR), 'local', LOCAL_ENTRIES_DIR) : [];
  return [...bundled, ...local];
}

/**
 * True when an entry ships third-party code with the package (L2/L3 not authored here).
 * @param {Entry} e
 */
export function bundlesThirdPartyCode(e) {
  return (e.trust === 'L2' || e.trust === 'L3') && e.source?.kind !== 'original-spec';
}

/** @param {string} date YYYY-MM-DD @param {number} months */
function addMonths(date, months) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** @param {unknown} v @returns {string[]} */
function strings(v) {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === 'object') return Object.values(v).flatMap(strings);
  return [];
}

/**
 * Validates entries: JSON Schema plus the cross-field rules of docs/catalog-contribution.md.
 * @param {LoadedEntry[]} loaded
 * @param {{ today?: string }} [opts] today as YYYY-MM-DD (default: the current UTC date)
 * @returns {{ errors: Problem[], warnings: Problem[], valid: LoadedEntry[] }}
 */
export function validateCatalog(loaded, { today = new Date().toISOString().slice(0, 10) } = {}) {
  /** @type {Problem[]} */
  const errors = [];
  /** @type {Problem[]} */
  const warnings = [];
  /** @type {Set<LoadedEntry>} */
  const bad = new Set();
  const ids = new Map();
  const known = new Map(loaded.filter((l) => l.entry && typeof l.entry.id === 'string').map((l) => [l.entry?.id, l.entry]));

  for (const l of loaded) {
    const id = typeof l.entry?.id === 'string' ? l.entry.id : basename(l.path, '.json');
    /** @param {string} rule @param {string} message @param {string} remediation */
    const err = (rule, message, remediation) => {
      errors.push({ id, file: l.path, rule, message, remediation });
      bad.add(l);
    };
    /** @param {string} rule @param {string} message @param {string} remediation */
    const warn = (rule, message, remediation) => warnings.push({ id, file: l.path, rule, message, remediation });

    if (!l.entry) {
      err('json', `not valid JSON: ${l.parseError}`, 'Fix the JSON syntax.');
      continue;
    }
    const e = l.entry;
    const schema = validateAgainst('catalog', e);
    if (!schema.valid) {
      for (const s of schema.errors) err('schema', `${s.path} ${s.message}`, 'Match catalog/catalog-schema.json.');
      continue;
    }
    if (e.id !== basename(l.path, '.json')) err('id-file', `id "${e.id}" does not match file name ${basename(l.path)}`, `Rename the file to ${e.id}.json or change the id.`);
    if (ids.has(e.id)) err('id-unique', `id "${e.id}" is also used by ${ids.get(e.id)}`, 'Give every entry a unique id; local entries may not reuse bundled ids.');
    else ids.set(e.id, l.path);

    const evidence = (e.evidence ?? []).filter((/** @type {string} */ x) => x.trim());
    if (e.trust === 'L3' && (!evidence.length || e.status !== 'tested')) {
      err('l3-evidence', 'L3 (tested component) requires status "tested" and non-empty evidence links', 'Link the test run or evaluation evidence and set status tested, or lower trust to L1/L2.');
    }
    if (e.status === 'tested' && !evidence.length) err('tested-evidence', 'status "tested" requires non-empty evidence', 'Link the evidence of the evaluation, or set status reviewed.');
    if (e.status === 'deprecated') {
      if (!e.deprecation) err('deprecation', 'deprecated entries need deprecation {note, replacement}', 'Add a changelog note and the id of the replacement entry.');
      else if (!e.deprecation.replacement) err('deprecation', 'deprecation.replacement is null', 'Point to the entry that replaces this one.');
      else if (!known.has(e.deprecation.replacement) || e.deprecation.replacement === e.id) err('deprecation', `replacement "${e.deprecation.replacement}" is not another entry in the catalog`, 'Use the id of an existing entry.');
      else if (known.get(e.deprecation.replacement)?.status === 'deprecated') err('deprecation', `replacement "${e.deprecation.replacement}" is itself deprecated`, 'Point to a live entry.');
    } else if (e.deprecation) {
      err('deprecation', `deprecation is set but status is "${e.status}"`, 'Remove deprecation or set status deprecated.');
    }
    const unclear = e.source.kind === 'link-only' || e.license.redistribution === 'unknown';
    if (unclear && e.status !== 'draft') err('unclear-provenance', 'link-only sources and unknown redistribution require status "draft"', 'Set status draft until permissions are confirmed.');
    if (unclear && (e.trust === 'L2' || e.trust === 'L3')) err('unclear-provenance', `${e.trust} is not allowed for link-only sources or unknown redistribution`, 'Use L0 (reference) or L1 (independent spec).');
    if (e.verified_on === null && e.status !== 'draft') err('unverified', 'verified_on is null, so status must be "draft"', 'Verify the entry and record the date, or set status draft.');
    if (e.trust === 'L0') {
      if (e.source.kind !== 'gallery-reference' && e.source.kind !== 'link-only') err('l0-source', 'L0 entries must be gallery-reference or link-only', 'Use L1 for original specs, L2 for licensed source.');
      if ((e.dependencies ?? []).length) err('l0-code', 'L0 entries are references only and may not carry code dependencies', 'Remove dependencies; implement from principles.');
    }
    if (e.source.kind === 'gallery-reference' && e.trust !== 'L0') err('gallery', 'gallery references are L0 only, never component sources', 'Set trust L0.');
    if (e.source.kind !== 'original-spec' && e.source.url === null && e.status !== 'draft') err('source-url', 'third-party sources need source.url unless status is draft', 'Record the exact URL you checked, or set status draft.');
    if (bundlesThirdPartyCode(e)) {
      if (!e.license.spdx || !SPDX_ALLOWLIST.includes(e.license.spdx)) err('license-allowlist', `bundled third-party code has SPDX "${e.license.spdx}", not on the allowlist (${SPDX_ALLOWLIST.join(', ')})`, 'Use L1 (independent spec) or L0 (link only) instead of bundling.');
      if (e.license.redistribution !== 'allowed' && e.license.redistribution !== 'attribution-required') err('license-allowlist', `bundled third-party code needs redistribution allowed or attribution-required, got "${e.license.redistribution}"`, 'Confirm the license terms or do not bundle.');
    }
    if (e.trust !== 'L3' && strings(e).some((s) => /production[\s-]ready/i.test(s))) err('production-ready', '"production-ready" claim on an entry that is not L3', 'Remove the claim; only evaluated L3 entries with evidence may make it.');
    if (e.verified_on) {
      if (e.verified_on > today) err('verified-future', `verified_on ${e.verified_on} is after today (${today})`, 'Record the date the check actually happened.');
      else if (addMonths(e.verified_on, STALE_AFTER_MONTHS) < today) warn('stale', `verified_on ${e.verified_on} is older than ${STALE_AFTER_MONTHS} months`, 'Re-check the entry (URL, license, behavior) and update verified_on, or deprecate it.');
    }
  }
  const order = (/** @type {Problem} */ a, /** @type {Problem} */ b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule) || a.message.localeCompare(b.message);
  return { errors: errors.sort(order), warnings: warnings.sort(order), valid: loaded.filter((l) => l.entry && !bad.has(l)) };
}

const STOPWORDS = new Set(('a an and are as at be but by for from has have i in into is it its me my need needs of on or our so that the their them then there these this to too us use used using want we what when where which while who will with without you your can should does do via per one each any all more most some than very just like also').split(' '));

/**
 * Light suffix stemmer: enough to match plural and -ing/-ed forms. Deterministic.
 * @param {string} w
 */
export function stem(w) {
  if (w.length <= 3 || /^\d+$/.test(w)) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('sses')) return w.slice(0, -2);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('es') && /(x|ch|sh|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  return w;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOPWORDS.has(t)).map(stem);
}

/** @param {Entry} e @returns {Record<keyof typeof FIELD_WEIGHTS, string>} */
function fields(e) {
  return {
    title: e.title,
    tags: (e.tags ?? []).join(' '),
    intent: e.intent,
    characteristics: (e.characteristics ?? []).join(' '),
    description: e.description,
    category: e.category,
    notes: [e.interaction, e.responsive, e.accessibility].filter(Boolean).join(' ')
  };
}

/** @param {LoadedEntry[]} loaded */
export function digestEntries(loaded) {
  const h = createHash('sha256');
  for (const l of [...loaded].sort((a, b) => a.path.localeCompare(b.path))) h.update(`${l.path}\n${JSON.stringify(l.entry)}\n`);
  return h.digest('hex');
}

/**
 * Builds the deterministic BM25F index (ADR-0014) from valid entries. No timestamps.
 * Deprecated entries are indexed (so search can say what replaced them) but filtered from results.
 * @param {LoadedEntry[]} valid
 * @param {{ bundledDigest?: string }} [opts]
 */
export function buildIndex(valid, { bundledDigest } = {}) {
  const sorted = [...valid].sort((a, b) => String(a.entry?.id).localeCompare(String(b.entry?.id)));
  /** @type {Map<string, Map<number, number>>} */
  const postings = new Map();
  const docs = sorted.map((l, i) => {
    const e = /** @type {Entry} */ (l.entry);
    let len = 0;
    for (const [field, text] of Object.entries(fields(e))) {
      const w = FIELD_WEIGHTS[/** @type {keyof typeof FIELD_WEIGHTS} */ (field)];
      for (const t of tokenize(text)) {
        len += w;
        const p = postings.get(t) ?? new Map();
        p.set(i, (p.get(i) ?? 0) + w);
        postings.set(t, p);
      }
    }
    return {
      id: e.id, title: e.title, category: e.category, trust: e.trust, status: e.status, intent: e.intent,
      path: l.path, origin: l.origin, axes: e.axes, frameworks: e.compatibility.frameworks, styling: e.compatibility.styling,
      replacement: e.deprecation?.replacement ?? null, len: round(len)
    };
  });
  const avgLen = docs.length ? round(docs.reduce((n, d) => n + d.len, 0) / docs.length) : 0;
  /** @type {Record<string, [number, number][]>} */
  const terms = {};
  for (const t of [...postings.keys()].sort()) terms[t] = [.../** @type {Map<number, number>} */ (postings.get(t)).entries()].sort((a, b) => a[0] - b[0]).map(([d, tf]) => [d, round(tf)]);
  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    kind: 'frontend-craft-catalog-index',
    algorithm: 'bm25f',
    params: BM25,
    fieldWeights: FIELD_WEIGHTS,
    digest: digestEntries(sorted),
    ...(bundledDigest ? { bundledDigest } : {}),
    entryCount: docs.length,
    avgLen,
    docs,
    terms
  };
}

/** @param {number} n */
function round(n) {
  return Math.round(n * 1000) / 1000;
}

/** Serializes an index deterministically (compact, one doc per line for readable diffs). */
export function serializeIndex(/** @type {ReturnType<typeof buildIndex>} */ index) {
  const { docs, terms, ...head } = index;
  const lines = [
    '{',
    ...Object.entries(head).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)},`),
    '"docs":[',
    docs.map((d) => JSON.stringify(d)).join(',\n'),
    '],',
    '"terms":{',
    Object.entries(terms).map(([t, p]) => `${JSON.stringify(t)}:${JSON.stringify(p)}`).join(',\n'),
    '}',
    '}'
  ];
  return lines.join('\n') + '\n';
}

/**
 * Finds the index search should read: the project's local index if present, else the shipped one.
 * @param {{ catalogRoot?: string, projectRoot: string }} opts
 * @returns {{ status: 'ok', index: any, file: string, origin: 'local' | 'bundled', stale: boolean, catalogRoot: string } | { status: 'missing', message: string } | { status: 'invalid', message: string }}
 */
export function locateIndex({ catalogRoot = BUNDLED_CATALOG, projectRoot }) {
  const shippedFile = join(catalogRoot, SHIPPED_INDEX_FILE);
  const localFile = join(projectRoot, LOCAL_INDEX_FILE);
  /** @param {string} f */
  const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
  /** @type {any} */
  let shipped = null;
  try {
    if (existsSync(shippedFile)) shipped = read(shippedFile);
  } catch (err) {
    return { status: 'invalid', message: `The catalog index ${shippedFile} is not valid JSON (${/** @type {Error} */ (err).message}). Reinstall the skill or run "node scripts/build-index.js" in the Frontend Craft repo.` };
  }
  if (existsSync(localFile)) {
    let local;
    try {
      local = read(localFile);
    } catch (err) {
      return { status: 'invalid', message: `${LOCAL_INDEX_FILE} is not valid JSON (${/** @type {Error} */ (err).message}). Run "craft index build" to rebuild it.` };
    }
    if (local.schemaVersion !== INDEX_SCHEMA_VERSION) return { status: 'invalid', message: `${LOCAL_INDEX_FILE} has index format ${local.schemaVersion}, this CLI reads ${INDEX_SCHEMA_VERSION}. Run "craft index build".` };
    return { status: 'ok', index: local, file: localFile, origin: 'local', stale: Boolean(shipped && local.bundledDigest !== shipped.digest), catalogRoot };
  }
  if (shipped) {
    if (shipped.schemaVersion !== INDEX_SCHEMA_VERSION) return { status: 'invalid', message: `${shippedFile} has index format ${shipped.schemaVersion}, this CLI reads ${INDEX_SCHEMA_VERSION}. Reinstall the skill.` };
    return { status: 'ok', index: shipped, file: shippedFile, origin: 'bundled', stale: false, catalogRoot };
  }
  return { status: 'missing', message: `No catalog index found (looked for ${LOCAL_INDEX_FILE} in the project and ${shippedFile}). Run "craft index build" to build one into ${LOCAL_INDEX_FILE}, or reinstall the skill package, which ships a prebuilt index.` };
}

/**
 * @typedef {{ axes?: Record<string, string>, frameworks?: string[], styling?: string[], trust?: string[], category?: string[], limit?: number }} SearchFilters
 */

/**
 * Ranks index docs for a query. Pure: same index + query + filters → same output.
 * Filters are hard constraints; an entry that declares no fit for a filtered axis passes (axis-agnostic).
 * @param {any} index
 * @param {string} query
 * @param {SearchFilters} [filters]
 */
export function search(index, query, filters = {}) {
  const limit = clampLimit(filters.limit);
  const qTerms = [...new Set(tokenize(query))];
  const N = index.docs.length;
  /** @type {Map<number, number>} */
  const scores = new Map();
  for (const t of qTerms) {
    const p = index.terms[t];
    if (!p) continue;
    const idf = Math.log(1 + (N - p.length + 0.5) / (p.length + 0.5));
    for (const [d, tf] of p) {
      const len = index.docs[d].len;
      const s = idf * (tf * (BM25.k1 + 1)) / (tf + BM25.k1 * (1 - BM25.b + BM25.b * len / (index.avgLen || 1)));
      scores.set(d, (scores.get(d) ?? 0) + s);
    }
  }
  const matched = [...scores.entries()].map(([d, score]) => ({ doc: index.docs[d], score: round(score) }));
  const passes = (/** @type {any} */ doc) => {
    if (doc.status === 'deprecated') return false;
    if (filters.trust?.length && !filters.trust.includes(doc.trust)) return false;
    if (filters.category?.length && !filters.category.includes(doc.category)) return false;
    for (const [axis, value] of Object.entries(filters.axes ?? {})) {
      const fit = doc.axes?.[axis];
      if (fit && !fit.includes(value)) return false;
    }
    const fw = (filters.frameworks ?? []).filter((f) => f !== 'any');
    if (fw.length && !doc.frameworks.includes('any') && !fw.some((f) => doc.frameworks.includes(f) || (f === 'next' && doc.frameworks.includes('react')))) return false;
    const st = (filters.styling ?? []).filter((s) => s !== 'any');
    if (st.length && !doc.styling.includes('any') && !st.some((s) => doc.styling.includes(s))) return false;
    return true;
  };
  const kept = matched.filter((m) => passes(m.doc));
  kept.sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id));
  return {
    terms: qTerms,
    matched: matched.length,
    filteredOut: matched.length - kept.length,
    results: kept.slice(0, limit).map((m) => ({
      id: m.doc.id, title: m.doc.title, category: m.doc.category, trust: m.doc.trust, status: m.doc.status,
      intent: m.doc.intent, score: m.score, path: m.doc.path, origin: m.doc.origin
    }))
  };
}

/** @param {number | undefined} n */
export function clampLimit(n) {
  if (n === undefined || !Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, Math.trunc(n)));
}

/**
 * Axis vocabulary from tokens/recipes.json (shipped with the skill), for --axes validation.
 * @returns {Record<string, string[]> | null}
 */
export function axisVocabulary() {
  const file = join(here, '..', '..', 'tokens', 'recipes.json');
  try {
    const r = JSON.parse(readFileSync(file, 'utf8'));
    return Object.fromEntries(Object.entries(r.axes).map(([k, v]) => [k, Object.keys(/** @type {any} */ (v).positions)]));
  } catch {
    return null;
  }
}

/**
 * Parses CLI filter strings. Returns an error message for usage problems.
 * @param {{ axes?: string, stack?: string, trust?: string, category?: string, limit?: string }} raw
 * @returns {{ filters: SearchFilters } | { error: string }}
 */
export function parseFilters(raw) {
  /** @param {string | undefined} s */
  const list = (s) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : []);
  /** @type {SearchFilters} */
  const filters = {};
  const vocab = axisVocabulary();
  if (raw.axes) {
    /** @type {Record<string, string>} */
    const axes = {};
    for (const pair of list(raw.axes)) {
      const [k, v, extra] = pair.split('=');
      if (!k || !v || extra !== undefined) return { error: `--axes expects key=value pairs (for example density=compact,motion=subtle), got "${pair}".` };
      if (vocab && !(k in vocab)) return { error: `--axes: unknown axis "${k}". Known: ${Object.keys(vocab).join(', ')}.` };
      if (vocab && !vocab[k].includes(v)) return { error: `--axes: unknown ${k} position "${v}". Known: ${vocab[k].join(', ')}.` };
      axes[k] = v;
    }
    filters.axes = axes;
  }
  for (const s of list(raw.stack)) {
    if (FRAMEWORKS.includes(s)) (filters.frameworks ??= []).push(s);
    else if (STYLING.includes(s)) (filters.styling ??= []).push(s);
    else return { error: `--stack: unknown value "${s}". Frameworks: ${FRAMEWORKS.join(', ')}. Styling: ${STYLING.join(', ')}.` };
  }
  if (raw.trust) {
    const t = list(raw.trust).map((x) => x.toUpperCase());
    const bad = t.filter((x) => !TRUST_LEVELS.includes(x));
    if (bad.length) return { error: `--trust: unknown level(s) ${bad.join(', ')}. Use L0, L1, L2, L3.` };
    filters.trust = t;
  }
  if (raw.category) {
    const c = list(raw.category);
    const bad = c.filter((x) => !CATEGORIES.includes(x));
    if (bad.length) return { error: `--category: unknown category ${bad.join(', ')}. Use ${CATEGORIES.join(', ')}.` };
    filters.category = c;
  }
  if (raw.limit !== undefined) {
    const n = Number(raw.limit);
    if (!Number.isFinite(n)) return { error: `--limit must be a number from 1 to 10, got "${raw.limit}".` };
    filters.limit = clampLimit(n);
  }
  return { filters };
}
