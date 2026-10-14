#!/usr/bin/env node
// Draw the false-positive review sample from a `craft lint --json` report:
// non-info findings, up to 10 per rule, evenly spaced through the report order.
// Usage: node scripts/eval/sample.js <lint.json> [label]
import { readFileSync } from 'node:fs';

const [file, label = 'repo'] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/eval/sample.js <lint.json> [label]');
  process.exit(2);
}
/** @type {{ findings: { ruleId: string, severity: string, file: string, line?: number, message: string }[] }} */
const report = JSON.parse(readFileSync(file, 'utf8'));
/** @type {Map<string, typeof report.findings>} */
const byRule = new Map();
for (const f of report.findings) if (f.severity !== 'info') byRule.set(f.ruleId, [...(byRule.get(f.ruleId) ?? []), f]);
let i = 0;
for (const list of byRule.values()) {
  const step = Math.max(1, Math.ceil(list.length / 10));
  for (let k = 0; k < list.length; k += step) {
    const f = list[k];
    console.log(`${label}#${i++} ${f.severity} ${f.ruleId} ${f.file}:${f.line ?? ''} | ${f.message.replace(/\s+/g, ' ').slice(0, 120)}`);
  }
}
