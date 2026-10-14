#!/usr/bin/env node
// Re-runs the 20-query catalog precision spot-check (docs/evals/catalog-precision.md) against
// the committed index and prints the per-query table and the aggregate numbers. The relevance
// judgments below were made by Claude, not a human; edit them only with a note in that doc.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { search, parseFilters } from '../../cli/src/catalog.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const index = JSON.parse(readFileSync(join(root, 'catalog', 'index', 'index.json'), 'utf8'));

/** @type {[string, Record<string, string>, string[]][]} query, filters, ids judged relevant among all entries */
const QUERIES = [
  ['admin screen listing invoices that users sort and filter', {}, ['data-table-sort-filter', 'faceted-filter-panel']],
  ['landing page pricing tiers with annual billing toggle', {}, ['pricing-plan-comparison', 'segmented-control']],
  ['blog post reading experience', { axes: 'density=airy' }, ['editorial-long-form-article']],
  ['developer documentation site navigation', { stack: 'astro' }, ['docs-layout-sidebar-toc']],
  ['let users quickly jump to any action with the keyboard', {}, ['command-palette']],
  ['signup form error messages', { stack: 'react,tailwind-v4' }, ['inline-validation-form']],
  ['checkout split into several steps', {}, ['multi-step-stepper']],
  ['show loading state while data fetches', { category: 'motion' }, ['skeleton-to-content-loading']],
  ['animate cards when the user scrolls down a marketing page', { axes: 'motion=subtle' }, ['scroll-linked-reveal-reduced-motion']],
  ['chatbot interface for an LLM product', {}, ['ai-chat-transcript-streaming-citations']],
  ['pull request review screen', { axes: 'density=compact' }, ['code-review-diff-view']],
  ['store locator with map', {}, ['map-list-split-view']],
  ['book an appointment time slot', {}, ['calendar-scheduling-week-view']],
  ['support Arabic and Hebrew', {}, ['rtl-aware-layout']],
  ['choose size and color of a shirt', {}, ['ecommerce-variant-picker', 'product-detail-page']],
  ['light and dark theme tokens', { category: 'design-system' }, ['dark-mode-semantic-mapping']],
  ['new user first run setup', {}, ['onboarding-checklist-home', 'empty-state-first-workspace', 'multi-step-stepper']],
  ['confirm before deleting a project', {}, ['destructive-action-confirmation', 'toast-notification-queue']],
  ['notify the user that the save succeeded with undo', {}, ['toast-notification-queue']],
  ['narrow down product listing results by brand and price', { trust: 'L1,L2' }, ['faceted-filter-panel', 'search-results-page']]
];

let p5 = 0;
let p3 = 0;
let top1 = 0;
let found = 0;
let relevantTotal = 0;
let ceiling5 = 0;
/** @type {string[]} */
const rows = [];
QUERIES.forEach(([q, raw, relevant], i) => {
  const parsed = parseFilters(raw);
  if ('error' in parsed) throw new Error(parsed.error);
  const results = search(index, q, parsed.filters).results;
  const ids = results.map((r) => r.id);
  const rel = new Set(relevant);
  const n5 = Math.min(5, ids.length) || 1;
  const n3 = Math.min(3, ids.length) || 1;
  const h5 = ids.slice(0, 5).filter((x) => rel.has(x)).length;
  const h3 = ids.slice(0, 3).filter((x) => rel.has(x)).length;
  p5 += h5 / n5;
  p3 += h3 / n3;
  ceiling5 += Math.min(rel.size, n5) / n5;
  top1 += rel.has(ids[0]) ? 1 : 0;
  found += h5;
  relevantTotal += rel.size;
  const filters = Object.entries(raw).map(([k, v]) => `--${k} ${v}`).join(' ') || 'none';
  const cells = results.map((r) => `${rel.has(r.id) ? 'yes' : 'no'} ${r.id} (${r.score})`).join('<br>');
  const missed = relevant.filter((x) => !ids.includes(x)).join(', ') || 'none';
  rows.push(`| ${i + 1} | ${q} | ${filters} | ${cells} | ${h3}/${n3} | ${h5}/${n5} | ${missed} |`);
});
const n = QUERIES.length;
console.log('| # | Query | Filters | Top 5 (relevant? id (score)) | P@3 | P@5 | Relevant entry missed |');
console.log('|---|---|---|---|---|---|---|');
console.log(rows.join('\n'));
console.log(`\nmacro P@5 ${(p5 / n).toFixed(3)} (ceiling ${(ceiling5 / n).toFixed(3)}), macro P@3 ${(p3 / n).toFixed(3)}, top-1 ${top1}/${n}, recall@5 ${found}/${relevantTotal} = ${(found / relevantTotal).toFixed(3)}`);
