#!/usr/bin/env node
// Validates every schema's examples (valid ones must pass, invalid ones must fail)
// and every shipped data file that has a schema. Exit 1 on any mismatch.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, unsupportedKeywords, formatErrors } from '../cli/src/schema.js';
import { loadSchema, SCHEMA_FILES } from '../cli/src/schemas.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
let checked = 0;

/** @param {string} msg */
const fail = (msg) => {
  failures++;
  console.error(`FAIL ${msg}`);
};

for (const name of /** @type {(keyof typeof SCHEMA_FILES)[]} */ (Object.keys(SCHEMA_FILES))) {
  const schema = loadSchema(name);
  const unknown = unsupportedKeywords(schema);
  if (unknown.length) fail(`${name} schema uses keywords the validator does not implement: ${unknown.join(', ')}`);
}

const exDir = join(root, 'cli', 'schemas', 'examples');
for (const file of readdirSync(exDir).sort()) {
  const m = /^(\w+)\.(valid|invalid)\..+\.json$/.exec(file);
  if (!m) {
    fail(`${file}: example names must be <schema>.<valid|invalid>.<label>.json`);
    continue;
  }
  const [, name, kind] = m;
  if (!(name in SCHEMA_FILES)) {
    fail(`${file}: unknown schema "${name}"`);
    continue;
  }
  const result = validate(loadSchema(/** @type {keyof typeof SCHEMA_FILES} */ (name)), JSON.parse(readFileSync(join(exDir, file), 'utf8')));
  checked++;
  if (kind === 'valid' && !result.valid) fail(`${file} should be valid:\n${formatErrors(result.errors)}`);
  else if (kind === 'invalid' && result.valid) fail(`${file} should be invalid but passed`);
  else console.log(`ok   ${file}${kind === 'invalid' ? ` (rejected: ${result.errors[0].path} ${result.errors[0].message})` : ''}`);
}

/** Shipped data files that must validate. Missing files are skipped only when listed as optional. */
const dataFiles = [
  { file: 'templates/tokens.json', schema: 'tokens', optional: true },
  { file: 'templates/craft.config.json', schema: 'config', optional: true },
  { file: 'tokens/recipes.json', schema: 'recipes', optional: true }
];
for (const { file, schema, optional } of dataFiles) {
  const p = join(root, file);
  if (!existsSync(p)) {
    if (!optional) fail(`${file} is missing`);
    continue;
  }
  const result = validate(loadSchema(/** @type {keyof typeof SCHEMA_FILES} */ (schema)), JSON.parse(readFileSync(p, 'utf8')));
  checked++;
  if (!result.valid) fail(`${file} does not match the ${schema} schema:\n${formatErrors(result.errors)}`);
  else console.log(`ok   ${file}`);
}

const entriesDir = join(root, 'catalog', 'entries');
if (existsSync(entriesDir)) {
  for (const file of readdirSync(entriesDir).filter((f) => f.endsWith('.json')).sort()) {
    const result = validate(loadSchema('catalog'), JSON.parse(readFileSync(join(entriesDir, file), 'utf8')));
    checked++;
    if (!result.valid) fail(`catalog/entries/${file}:\n${formatErrors(result.errors)}`);
    else console.log(`ok   catalog/entries/${file}`);
  }
}

console.log(`\n${checked} files checked, ${failures} failure(s).`);
process.exit(failures ? 1 : 0);
