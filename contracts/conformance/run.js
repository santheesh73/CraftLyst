#!/usr/bin/env node
// Conformance kit runner.
//   node contracts/conformance/run.js --adapter <file.json> [--components a,b] [--json] [--allow-network]
// Exit codes: 0 every check passed or was not applicable, 1 at least one check failed,
// 2 usage error (bad flags or adapter), 3 Playwright, axe-core, or Chromium unavailable.
// Prints to stdout only; it writes no files.
import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runConformance, toMarkdown } from './lib/harness.js';
import { COMPONENTS } from './lib/checks.js';

const USAGE = `Usage: node contracts/conformance/run.js --adapter <file.json> [--components ${COMPONENTS.slice(0, 2).join(',')}] [--json] [--allow-network]

Components: ${COMPONENTS.join(', ')}
Exit codes: 0 all pass or n/a, 1 failures, 2 usage, 3 Playwright/axe-core/Chromium unavailable.
`;

/**
 * @param {string[]} argv
 * @param {{ stdout: (s: string) => void, stderr: (s: string) => void }} io
 * @returns {Promise<number>}
 */
export async function cli(argv, io) {
  /** @type {any} */
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        adapter: { type: 'string' },
        components: { type: 'string' },
        json: { type: 'boolean', default: false },
        'allow-network': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false }
      }
    }));
  } catch (err) {
    io.stderr(`${/** @type {Error} */ (err).message}\n${USAGE}`);
    return 2;
  }
  if (values.help) {
    io.stdout(USAGE);
    return 0;
  }
  if (!values.adapter) {
    io.stderr(`--adapter is required.\n${USAGE}`);
    return 2;
  }
  const file = resolve(String(values.adapter));
  if (!existsSync(file)) {
    io.stderr(`Adapter not found: ${file}\n`);
    return 2;
  }
  /** @type {any} */
  let adapter;
  try {
    adapter = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    io.stderr(`Adapter ${file} is not valid JSON: ${/** @type {Error} */ (err).message}\n`);
    return 2;
  }
  const components = values.components ? String(values.components).split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const r = await runConformance(adapter, { baseDir: dirname(file), components, allowNetwork: Boolean(values['allow-network']) });
  if (r.status === 'usage') {
    io.stderr(`${r.message}\n`);
    return 2;
  }
  if (r.status === 'unavailable') {
    if (values.json) io.stdout(JSON.stringify({ tool: 'frontend-craft-conformance', ok: false, status: 'unavailable', message: r.message }, null, 2) + '\n');
    else io.stderr(`${r.message}\n`);
    return 3;
  }
  if (r.status !== 'ok') return 3;
  io.stdout(values.json ? JSON.stringify(r.result, null, 2) + '\n' : toMarkdown(r.result));
  return r.result.summary.fail ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await cli(process.argv.slice(2), { stdout: (s) => process.stdout.write(s), stderr: (s) => process.stderr.write(s) });
}
