import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, unsupportedKeywords } from '../src/schema.js';
import { loadSchema, SCHEMA_FILES } from '../src/schemas.js';

test('type checks distinguish integer, number, null, array', () => {
  assert.equal(validate({ type: 'integer' }, 3).valid, true);
  assert.equal(validate({ type: 'integer' }, 3.5).valid, false);
  assert.equal(validate({ type: 'number' }, 3).valid, true);
  assert.equal(validate({ type: ['string', 'null'] }, null).valid, true);
  assert.equal(validate({ type: 'object' }, []).valid, false);
});

test('required, additionalProperties and nested paths', () => {
  const schema = { type: 'object', required: ['a'], additionalProperties: false, properties: { a: { type: 'object', properties: { b: { type: 'string' } } } } };
  const r = validate(schema, { a: { b: 1 }, c: true });
  assert.equal(r.valid, false);
  assert.deepEqual(r.errors.map((e) => e.path).sort(), ['$.a.b', '$.c']);
  assert.match(validate(schema, {}).errors[0].message, /missing required property "a"/);
});

test('string constraints and formats', () => {
  assert.equal(validate({ type: 'string', pattern: '^a' }, 'abc').valid, true);
  assert.equal(validate({ type: 'string', minLength: 2 }, 'a').valid, false);
  assert.equal(validate({ type: 'string', format: 'date' }, '2026-02-30').valid, false);
  assert.equal(validate({ type: 'string', format: 'date' }, '2026-10-14').valid, true);
  assert.equal(validate({ type: 'string', format: 'date' }, '14/10/2026').valid, false);
  assert.equal(validate({ type: 'string', format: 'date-time' }, '2026-10-14T08:00:00Z').valid, true);
  assert.equal(validate({ type: 'string', format: 'uri' }, 'https://example.com/x').valid, true);
  assert.equal(validate({ type: 'string', format: 'uri' }, 'javascript:alert(1)').valid, false);
  assert.throws(() => validate({ type: 'string', format: 'email' }, 'a@b.c'), /Unsupported format/);
});

test('numbers, arrays, uniqueness', () => {
  assert.equal(validate({ minimum: 0, maximum: 1 }, 1.5).valid, false);
  assert.equal(validate({ type: 'array', minItems: 1 }, []).valid, false);
  assert.equal(validate({ type: 'array', uniqueItems: true }, [1, 1]).valid, false);
  assert.equal(validate({ type: 'array', items: { type: 'string' } }, ['a', 2]).errors[0].path, '$[1]');
});

test('oneOf requires exactly one match, anyOf at least one', () => {
  const one = { oneOf: [{ type: 'number' }, { type: 'integer' }] };
  assert.equal(validate(one, 1.5).valid, true);
  assert.equal(validate(one, 2).valid, false, 'integer matches both branches');
  assert.equal(validate({ anyOf: [{ type: 'string' }, { type: 'number' }] }, true).valid, false);
});

test('$ref, patternProperties, propertyNames, const, enum', () => {
  const schema = {
    $defs: { name: { type: 'string', pattern: '^[a-z]+$' } },
    type: 'object',
    propertyNames: { $ref: '#/$defs/name' },
    patternProperties: { '^x': { const: 1 } },
    properties: { kind: { enum: ['a', 'b'] } }
  };
  assert.equal(validate(schema, { kind: 'a', xa: 1 }).valid, true);
  assert.equal(validate(schema, { kind: 'c' }).valid, false);
  assert.equal(validate(schema, { xb: 2 }).valid, false);
  assert.equal(validate(schema, { Bad: 1 }).valid, false);
  assert.throws(() => validate({ $ref: 'http://x/y' }, 1), /only local/);
});

test('boolean schemas', () => {
  assert.equal(validate({ properties: { a: false } }, { a: 1 }).valid, false);
  assert.equal(validate({ properties: { a: true } }, { a: 1 }).valid, true);
});

test('every shipped schema uses only implemented keywords', () => {
  for (const name of /** @type {(keyof typeof SCHEMA_FILES)[]} */ (Object.keys(SCHEMA_FILES))) {
    assert.deepEqual(unsupportedKeywords(loadSchema(name)), [], `${name} uses unsupported keywords`);
  }
});

test('unsupportedKeywords finds unknown keywords in nested schemas', () => {
  assert.deepEqual(unsupportedKeywords({ properties: { a: { if: {}, then: {} } } }), ['if', 'then']);
});
