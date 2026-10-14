// Design Contract validation: the ctr/contract rule. Checks .craft/DESIGN.md structure
// and size, tokens.json schema and references, config schema, and decisions.md presence.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateAgainst } from './schemas.js';
import { checkReferences } from './tokens.js';

/** @typedef {{ ruleId: string, file: string, line?: number, severity: 'block' | 'warn' | 'info', confidence: number, message: string, remediation: string }} Finding */

export const RULE_ID = 'ctr/contract';
export const DEFAULT_MAX_LINES = 150;

/** Required DESIGN.md sections, matched against "## ..." headings in order of the spec. */
export const SECTIONS = [
  { key: 'product', label: 'Product, audience, primary tasks', match: /product|audience/i },
  { key: 'direction', label: 'Direction', match: /direction/i },
  { key: 'signature', label: 'Signature move', match: /signature/i },
  { key: 'tokens', label: 'Token summary', match: /token/i },
  { key: 'never', label: 'Never do', match: /never/i },
  { key: 'open', label: 'Open questions and assumptions', match: /open questions|assumptions/i }
];

/** Direction axes that must each carry a value and a reason. */
export const AXES = [
  { key: 'density', match: /density/i },
  { key: 'temperature', match: /temperature/i },
  { key: 'formality', match: /formality/i },
  { key: 'motion', match: /motion/i },
  { key: 'shape', match: /shape/i },
  { key: 'contrast', match: /contrast/i },
  { key: 'voice', match: /voice|typograph/i },
  { key: 'imagery', match: /imagery/i }
];

const PLACEHOLDER = /\{\{[^}]*\}\}/;

/**
 * @param {string} file
 * @param {string} message
 * @param {string} remediation
 * @param {'block' | 'warn' | 'info'} [severity]
 * @param {number} [line]
 * @returns {Finding}
 */
function finding(file, message, remediation, severity = 'block', line) {
  /** @type {Finding} */
  const f = { ruleId: RULE_ID, file, severity, confidence: 1, message, remediation };
  if (line) f.line = line;
  return f;
}

/**
 * Validate DESIGN.md text.
 * @param {string} text
 * @param {{ file?: string, maxLines?: number }} [opts]
 * @returns {Finding[]}
 */
export function checkDesignMd(text, opts = {}) {
  const file = opts.file ?? '.craft/DESIGN.md';
  const maxLines = opts.maxLines ?? DEFAULT_MAX_LINES;
  /** @type {Finding[]} */
  const out = [];
  const lines = text.replace(/\n$/, '').split('\n');

  if (lines.length > maxLines) {
    out.push(finding(file, `DESIGN.md has ${lines.length} lines; the limit is ${maxLines}.`, 'Move rationale to decisions.md and detail to tokens.json; keep DESIGN.md a summary an agent can read every session.', 'block', maxLines + 1));
  }

  /** @type {{ title: string, line: number, body: string[] }[]} */
  const headings = [];
  lines.forEach((l, i) => {
    const m = /^##\s+(.+?)\s*$/.exec(l);
    if (m) headings.push({ title: m[1], line: i + 1, body: [] });
    else if (headings.length) headings[headings.length - 1].body.push(l);
  });

  /** @type {Record<string, { title: string, line: number, body: string[] }>} */
  const found = {};
  for (const s of SECTIONS) {
    const h = headings.find((x) => s.match.test(x.title) && !Object.values(found).includes(x));
    if (!h) {
      out.push(finding(file, `Missing required section "${s.label}".`, `Add a "## ${s.label}" section. See templates/DESIGN.md.`));
      continue;
    }
    found[s.key] = h;
    const content = h.body.filter((l) => l.trim() && !l.trim().startsWith('<!--')).join('\n');
    if (!content.trim()) {
      out.push(finding(file, `Section "${s.label}" is empty.`, 'Fill it in, or record what is unknown under "Open questions and assumptions".', 'block', h.line));
    }
  }

  const direction = found.direction;
  if (direction) {
    for (const axis of AXES) {
      const row = direction.body.find((l) => axis.match.test(l) && /^\s*(\||[-*])/.test(l));
      if (!row) {
        out.push(finding(file, `Direction is missing the "${axis.key}" axis.`, `Add a row: | ${axis.key} | <value> | <one-line reason> |`, 'block', direction.line));
        continue;
      }
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
      const hasReason = row.trim().startsWith('|') ? cells.length >= 3 && cells[2].length > 0 : /[:]\s*\S+.*(—|-|because|:)\s*\S+/.test(row);
      if (!hasReason) {
        out.push(finding(file, `Direction axis "${axis.key}" has no reason.`, 'Every axis value needs a one-line reason tied to the product or audience.', 'block', direction.line));
      }
    }
  }

  lines.forEach((l, i) => {
    if (PLACEHOLDER.test(l)) {
      out.push(finding(file, `Unfilled template placeholder: ${l.trim().slice(0, 80)}`, 'Replace every {{...}} with a product-specific decision, or move it to "Open questions and assumptions".', 'warn', i + 1));
    }
  });
  return out;
}

/**
 * Validate a project's .craft/ directory.
 * @param {string} projectRoot
 * @returns {{ findings: Finding[], files: string[] }}
 */
export function checkContract(projectRoot) {
  const dir = join(projectRoot, '.craft');
  /** @type {Finding[]} */
  const findings = [];
  /** @type {string[]} */
  const files = [];
  // A .craft/ holding only reports (written by craft report) is still "no contract".
  if (!['DESIGN.md', 'tokens.json', 'decisions.md', 'craft.config.json'].some((f) => existsSync(join(dir, f)))) {
    findings.push(finding('.craft/', 'No design contract found (.craft/ has no DESIGN.md, tokens.json, or config).', 'Run `craft init` to scaffold one, or `craft init --from-repo` when the project already has a design system.'));
    return { findings, files };
  }

  let maxLines = DEFAULT_MAX_LINES;
  const configPath = join(dir, 'craft.config.json');
  if (existsSync(configPath)) {
    files.push('.craft/craft.config.json');
    const parsed = parseJson(configPath, '.craft/craft.config.json', findings);
    if (parsed !== undefined) {
      const r = validateAgainst('config', parsed);
      for (const e of r.errors) findings.push(finding('.craft/craft.config.json', `Config ${e.path} ${e.message}.`, 'Fix the value; the schema is cli/schemas/config.schema.json.'));
      if (r.valid && parsed.contract?.maxDesignLines) maxLines = parsed.contract.maxDesignLines;
    }
  }

  const designPath = join(dir, 'DESIGN.md');
  if (!existsSync(designPath)) {
    findings.push(finding('.craft/DESIGN.md', 'DESIGN.md is missing.', 'Run `craft init` or copy templates/DESIGN.md into .craft/.'));
  } else {
    files.push('.craft/DESIGN.md');
    findings.push(...checkDesignMd(readFileSync(designPath, 'utf8'), { maxLines }));
  }

  const tokensPath = join(dir, 'tokens.json');
  if (!existsSync(tokensPath)) {
    findings.push(finding('.craft/tokens.json', 'tokens.json is missing.', 'Run `craft init` or write tokens from the Direction Engine recipes.'));
  } else {
    files.push('.craft/tokens.json');
    const parsed = parseJson(tokensPath, '.craft/tokens.json', findings);
    if (parsed !== undefined) {
      const r = validateAgainst('tokens', parsed);
      for (const e of r.errors) findings.push(finding('.craft/tokens.json', `Tokens ${e.path} ${e.message}.`, 'Fix the value; the schema is cli/schemas/tokens.schema.json.'));
      if (r.valid) {
        for (const p of checkReferences(parsed)) findings.push(finding('.craft/tokens.json', p, 'Point the reference at an existing token, or add the missing token.'));
      }
    }
  }

  if (!existsSync(join(dir, 'decisions.md'))) {
    findings.push(finding('.craft/decisions.md', 'decisions.md is missing.', 'Create it (templates/decisions.md) and log the chosen and rejected directions.', 'warn'));
  } else {
    files.push('.craft/decisions.md');
  }
  return { findings, files };
}

/**
 * @param {string} path
 * @param {string} label
 * @param {Finding[]} findings
 * @returns {any}
 */
function parseJson(path, label, findings) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    findings.push(finding(label, `Invalid JSON: ${/** @type {Error} */ (err).message}`, 'Fix the syntax error at the reported position.'));
    return undefined;
  }
}
