#!/usr/bin/env node
// License gate (P4): every catalog entry that bundles third-party code (L2/L3 not authored
// here) must carry an SPDX id on the allowlist, permit redistribution, and name its source URL.
// Read-only. Exit 1 on any violation.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, bundlesThirdPartyCode, SPDX_ALLOWLIST } from '../cli/src/catalog.js';

const catalogRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'catalog');
const loaded = loadCatalog({ catalogRoot });
/** @type {string[]} */
const problems = [];
let bundled = 0;
for (const l of loaded) {
  if (!l.entry) {
    problems.push(`${l.path}: not valid JSON (${l.parseError})`);
    continue;
  }
  const e = l.entry;
  if (!bundlesThirdPartyCode(e)) continue;
  bundled++;
  const spdx = e.license?.spdx;
  if (!spdx || !SPDX_ALLOWLIST.includes(spdx)) problems.push(`${l.path}: bundles third-party code under "${spdx}", which is not on the allowlist (${SPDX_ALLOWLIST.join(', ')}). Lower trust to L1 or L0, or remove the code.`);
  if (!['allowed', 'attribution-required'].includes(e.license?.redistribution)) problems.push(`${l.path}: redistribution is "${e.license?.redistribution}"; bundling needs allowed or attribution-required.`);
  if (!e.source?.url) problems.push(`${l.path}: bundled third-party code needs source.url for provenance.`);
}
if (problems.length) {
  console.error(problems.map((p) => `FAIL ${p}`).join('\n'));
  process.exit(1);
}
console.log(`license gate: ${loaded.length} entries checked, ${bundled} bundle third-party code, all on the allowlist.`);
