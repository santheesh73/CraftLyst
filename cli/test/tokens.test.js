import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, checkPairs, checkReferences } from '../src/tokens.js';

/** @returns {any} */
const base = () => ({
  schemaVersion: '1.0',
  name: 't',
  themes: ['light', 'dark'],
  primitive: { color: { ink: '#111111', paper: '#ffffff', gray: '#999999' } },
  semantic: {
    color: {
      text: { light: '{primitive.color.ink}', dark: '{primitive.color.paper}' },
      surface: { light: '{primitive.color.paper}', dark: '{primitive.color.ink}' },
      muted: '{primitive.color.gray}'
    }
  },
  pairs: [{ fg: 'color.text', bg: 'color.surface', use: 'text' }]
});

test('resolves references per theme', () => {
  const t = base();
  assert.equal(resolve(t, 'semantic.color.text', 'light'), '#111111');
  assert.equal(resolve(t, 'semantic.color.text', 'dark'), '#ffffff');
  assert.equal(resolve(t, 'semantic.color.muted', 'dark'), '#999999');
});

test('reports unknown references and cycles', () => {
  const t = base();
  t.semantic.color.bad = '{primitive.color.nope}';
  t.semantic.color.a = '{semantic.color.b}';
  t.semantic.color.b = '{semantic.color.a}';
  const problems = checkReferences(t);
  assert.ok(problems.some((p) => p.includes('Unknown token "primitive.color.nope"')));
  assert.ok(problems.some((p) => p.includes('cycle')));
});

test('pairs pass and fail per theme', () => {
  const t = base();
  t.pairs.push({ fg: 'color.muted', bg: 'color.surface', use: 'text' });
  const r = checkPairs(t);
  assert.equal(r.length, 4);
  assert.deepEqual(r.map((x) => x.status), ['pass', 'fail', 'pass', 'pass']);
});

test('translucent backgrounds are unresolved, not passed', () => {
  const t = base();
  t.primitive.color.glass = 'rgb(255 255 255 / 0.4)';
  t.semantic.color.glass = '{primitive.color.glass}';
  t.pairs = [{ fg: 'color.text', bg: 'color.glass', use: 'text' }];
  assert.ok(checkPairs(t).every((x) => x.status === 'unresolved'));
});

test('the shipped template passes every pair in every theme', () => {
  const t = JSON.parse(readFileSync(new URL('../../templates/tokens.json', import.meta.url), 'utf8'));
  const results = checkPairs(t);
  assert.ok(results.length >= 20);
  assert.deepEqual(results.filter((x) => x.status !== 'pass'), []);
  assert.deepEqual(checkReferences(t), []);
});
