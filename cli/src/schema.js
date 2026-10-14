// Minimal JSON Schema (draft 2020-12 subset) validator. See docs/decisions/0004.
// Only the keywords listed in SUPPORTED_KEYWORDS are implemented; a test asserts
// that every schema we ship uses nothing else.

/** @typedef {{ path: string, message: string }} SchemaError */
/** @typedef {Record<string, any>} Schema */

/** Keywords that affect validation. */
export const VALIDATION_KEYWORDS = new Set([
  'type', 'properties', 'required', 'additionalProperties', 'patternProperties',
  'items', 'enum', 'const', 'pattern', 'minLength', 'maxLength', 'minimum', 'maximum',
  'minItems', 'maxItems', 'uniqueItems', 'oneOf', 'anyOf', 'allOf', '$ref', 'format',
  'minProperties', 'propertyNames'
]);

/** Keywords that are annotations only and are ignored during validation. */
export const ANNOTATION_KEYWORDS = new Set([
  '$schema', '$id', '$defs', '$comment', 'title', 'description', 'examples', 'default',
  'deprecated', 'readOnly'
]);

const FORMATS = {
  /** @param {string} v */
  date: (v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  },
  /** @param {string} v */
  'date-time': (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(Date.parse(v)),
  /** @param {string} v */
  uri: (v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }
};

/**
 * @param {unknown} value
 * @returns {string}
 */
function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

/**
 * @param {string} expected
 * @param {string} actual
 */
function typeMatches(expected, actual) {
  if (expected === actual) return true;
  return expected === 'number' && actual === 'integer';
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * @param {Schema} root
 * @param {string} ref
 * @returns {Schema}
 */
function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported $ref "${ref}": only local "#/..." references are supported.`);
  /** @type {any} */
  let node = root;
  for (const part of ref.slice(2).split('/')) {
    node = node?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  if (!node || typeof node !== 'object') throw new Error(`Unresolvable $ref "${ref}".`);
  return node;
}

/**
 * Validate a value against a schema.
 * @param {Schema} schema
 * @param {unknown} value
 * @returns {{ valid: boolean, errors: SchemaError[] }}
 */
export function validate(schema, value) {
  /** @type {SchemaError[]} */
  const errors = [];
  check(schema, schema, value, '$', errors);
  return { valid: errors.length === 0, errors };
}

/**
 * @param {Schema} root
 * @param {Schema | boolean} schema
 * @param {any} value
 * @param {string} path
 * @param {SchemaError[]} errors
 */
function check(root, schema, value, path, errors) {
  if (schema === true) return;
  if (schema === false) {
    errors.push({ path, message: 'is not allowed here' });
    return;
  }
  if (schema.$ref) check(root, resolveRef(root, schema.$ref), value, path, errors);

  const actual = typeOf(value);
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(t, actual))) {
      errors.push({ path, message: `must be ${types.join(' or ')}, got ${actual}` });
      return;
    }
  }
  if (schema.const !== undefined && !deepEqual(schema.const, value)) {
    errors.push({ path, message: `must equal ${JSON.stringify(schema.const)}` });
  }
  if (schema.enum && !schema.enum.some((/** @type {unknown} */ e) => deepEqual(e, value))) {
    errors.push({ path, message: `must be one of ${schema.enum.map((/** @type {unknown} */ e) => JSON.stringify(e)).join(', ')}, got ${JSON.stringify(value)}` });
  }

  if (actual === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push({ path, message: `must have at least ${schema.minLength} characters` });
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push({ path, message: `must have at most ${schema.maxLength} characters` });
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push({ path, message: `must match pattern ${schema.pattern}` });
    if (schema.format) {
      const fn = /** @type {Record<string, (v: string) => boolean>} */ (FORMATS)[schema.format];
      if (!fn) throw new Error(`Unsupported format "${schema.format}" at ${path}.`);
      if (!fn(value)) errors.push({ path, message: `must be a valid ${schema.format}` });
    }
  }

  if (actual === 'number' || actual === 'integer') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push({ path, message: `must be >= ${schema.minimum}` });
    if (schema.maximum !== undefined && value > schema.maximum) errors.push({ path, message: `must be <= ${schema.maximum}` });
  }

  if (actual === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push({ path, message: `must have at least ${schema.minItems} items` });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push({ path, message: `must have at most ${schema.maxItems} items` });
    if (schema.uniqueItems) {
      const seen = new Set();
      value.forEach((/** @type {unknown} */ item, /** @type {number} */ i) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) errors.push({ path: `${path}[${i}]`, message: 'duplicates an earlier item' });
        seen.add(key);
      });
    }
    if (schema.items !== undefined) {
      value.forEach((/** @type {unknown} */ item, /** @type {number} */ i) => check(root, schema.items, item, `${path}[${i}]`, errors));
    }
  }

  if (actual === 'object') {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) errors.push({ path, message: `must have at least ${schema.minProperties} properties` });
    for (const req of schema.required ?? []) {
      if (!(req in value)) errors.push({ path, message: `is missing required property "${req}"` });
    }
    const props = schema.properties ?? {};
    const patterns = Object.entries(schema.patternProperties ?? {}).map(([p, s]) => /** @type {[RegExp, Schema]} */ ([new RegExp(p, 'u'), s]));
    for (const key of keys) {
      const childPath = /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
      if (schema.propertyNames) check(root, schema.propertyNames, key, `${childPath} (name)`, errors);
      let matched = false;
      if (key in props) {
        matched = true;
        check(root, props[key], value[key], childPath, errors);
      }
      for (const [re, s] of patterns) {
        if (re.test(key)) {
          matched = true;
          check(root, s, value[key], childPath, errors);
        }
      }
      if (!matched && schema.additionalProperties !== undefined) {
        if (schema.additionalProperties === false) errors.push({ path: childPath, message: 'is not an allowed property' });
        else check(root, schema.additionalProperties, value[key], childPath, errors);
      }
    }
  }

  if (schema.allOf) for (const s of schema.allOf) check(root, s, value, path, errors);
  if (schema.anyOf) {
    const ok = schema.anyOf.some((/** @type {Schema} */ s) => validateSub(root, s, value, path).length === 0);
    if (!ok) errors.push({ path, message: 'does not match any allowed shape (anyOf)' });
  }
  if (schema.oneOf) {
    const results = schema.oneOf.map((/** @type {Schema} */ s) => validateSub(root, s, value, path));
    const passing = results.filter((/** @type {SchemaError[]} */ r) => r.length === 0).length;
    if (passing !== 1) {
      if (passing === 0) {
        // Report the branch with the fewest errors: usually the one the author intended.
        const best = results.reduce((/** @type {SchemaError[]} */ a, /** @type {SchemaError[]} */ b) => (b.length < a.length ? b : a));
        errors.push(...best);
      } else {
        errors.push({ path, message: `matches ${passing} shapes but must match exactly one (oneOf)` });
      }
    }
  }
}

/**
 * @param {Schema} root
 * @param {Schema} schema
 * @param {unknown} value
 * @param {string} path
 * @returns {SchemaError[]}
 */
function validateSub(root, schema, value, path) {
  /** @type {SchemaError[]} */
  const errs = [];
  check(root, schema, value, path, errs);
  return errs;
}

/**
 * List keywords used anywhere in a schema that this validator does not know.
 * @param {unknown} schema
 * @returns {string[]}
 */
export function unsupportedKeywords(schema) {
  /** @type {Set<string>} */
  const found = new Set();
  /** @param {any} node @param {boolean} isSchema */
  const walk = (node, isSchema) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, isSchema));
      return;
    }
    if (!isSchema) return;
    for (const [k, v] of Object.entries(node)) {
      if (!VALIDATION_KEYWORDS.has(k) && !ANNOTATION_KEYWORDS.has(k)) found.add(k);
      if (k === 'properties' || k === 'patternProperties' || k === '$defs') {
        for (const child of Object.values(v ?? {})) walk(child, true);
      } else if (['items', 'additionalProperties', 'propertyNames'].includes(k)) {
        walk(v, true);
      } else if (['oneOf', 'anyOf', 'allOf'].includes(k)) {
        walk(v, true);
      }
    }
  };
  walk(schema, true);
  return [...found].sort();
}

/**
 * Format errors for humans.
 * @param {SchemaError[]} errors
 * @returns {string}
 */
export function formatErrors(errors) {
  return errors.map((e) => `  ${e.path} ${e.message}`).join('\n');
}
