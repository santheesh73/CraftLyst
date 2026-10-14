import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAgainst } from '../src/schemas.js';

const recipes = JSON.parse(readFileSync(new URL('../../tokens/recipes.json', import.meta.url), 'utf8'));
const designTemplate = readFileSync(new URL('../../templates/DESIGN.md', import.meta.url), 'utf8');

test('recipes.json matches its schema', () => {
  assert.deepEqual(validateAgainst('recipes', recipes).errors, []);
});

test('every range has min <= max', () => {
  /** @param {any} node @param {string} path */
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    if ('min' in node && 'max' in node) assert.ok(node.min <= node.max, `${path}: min ${node.min} > max ${node.max}`);
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  };
  walk(recipes.axes, 'axes');
});

test('conflict rules name real axis positions', () => {
  for (const c of recipes.conflicts) {
    for (const [axis, pos] of Object.entries(c.when)) {
      assert.ok(recipes.axes[axis].positions[/** @type {string} */ (pos)], `conflict refers to unknown ${axis}=${pos}`);
    }
  }
});

test('DESIGN.md template offers exactly the recipe positions for each axis', () => {
  const rows = {
    density: 'Density', temperature: 'Temperature', formality: 'Formality', motion: 'Motion energy',
    shape: 'Shape language', contrast: 'Contrast', voice: 'Typographic voice', imagery: 'Imagery'
  };
  for (const [axis, label] of Object.entries(rows)) {
    const line = designTemplate.split('\n').find((l) => l.startsWith(`| ${label} |`));
    assert.ok(line, `template lacks row for ${label}`);
    const offered = /\{\{([^}]*)\}\}/.exec(line)?.[1].split('/').map((s) => s.trim()) ?? [];
    assert.deepEqual(offered.sort(), Object.keys(recipes.axes[axis].positions).sort(), `positions differ for ${axis}`);
  }
});
