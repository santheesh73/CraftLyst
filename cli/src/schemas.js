// Locates and loads the JSON schemas that ship with the CLI.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validate } from './schema.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Schema files by name. The catalog schema lives with the catalog in the repo and is copied next to the CLI schemas in the package. */
export const SCHEMA_FILES = {
  tokens: 'tokens.schema.json',
  config: 'config.schema.json',
  report: 'report.schema.json',
  recipes: 'recipes.schema.json',
  catalog: 'catalog-schema.json'
};

/**
 * @param {keyof typeof SCHEMA_FILES} name
 * @returns {string}
 */
export function schemaPath(name) {
  const file = SCHEMA_FILES[name];
  const candidates = [join(here, '..', 'schemas', file), join(here, '..', '..', 'catalog', file)];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`Schema "${name}" not found. Looked in: ${candidates.join(', ')}. Reinstall the skill package.`);
  return found;
}

/**
 * @param {keyof typeof SCHEMA_FILES} name
 * @returns {Record<string, any>}
 */
export function loadSchema(name) {
  return JSON.parse(readFileSync(schemaPath(name), 'utf8'));
}

/**
 * @param {keyof typeof SCHEMA_FILES} name
 * @param {unknown} value
 */
export function validateAgainst(name, value) {
  return validate(loadSchema(name), value);
}
