// Reasoned exceptions: `craft-allow <rule-id>: <reason>` in CSS/JS/JSX/HTML comments,
// and per-glob exceptions in craft.config.json.
import { globToRegExp } from './glob.js';

/**
 * @typedef {{ ruleId: string, reason: string, file: string, line: number, endLine: number, source: 'inline' | 'config', valid: boolean, problem?: string }} Exception
 */

const ALLOW = /^craft-allow\s+([a-z0-9]+\/[a-z0-9-]+)?\s*(:\s*(.*))?$/s;

/**
 * Collect inline exceptions in a document. Each covers its own lines plus the first
 * element or CSS rule that starts on or after the comment's last line.
 * @param {import('./document.js').Document} doc
 * @param {Set<string>} knownRules
 * @returns {Exception[]}
 */
export function inlineExceptions(doc, knownRules) {
  /** @type {Exception[]} */
  const out = [];
  /** @type {{ line: number, endLine: number }[]} */
  const nodes = [...doc.all.map((e) => ({ line: e.line, endLine: e.endLine })), ...doc.css.flatMap((c) => c.rules.map((r) => ({ line: r.line, endLine: r.endLine })))];
  nodes.sort((a, b) => a.line - b.line || b.endLine - a.endLine);
  for (const c of doc.comments) {
    const text = c.text.replace(/^\*+|\*+$/g, '').trim();
    if (!text.startsWith('craft-allow')) continue;
    const m = ALLOW.exec(text);
    const ruleId = m?.[1] ?? '';
    const reason = (m?.[3] ?? '').trim();
    const next = nodes.find((n) => n.line >= c.endLine && !(n.line === c.line && n.endLine === c.endLine && doc.kind === 'html'));
    const endLine = Math.max(c.endLine + 1, next ? next.endLine : c.endLine + 1);
    /** @type {Exception} */
    const ex = { ruleId, reason, file: doc.file, line: c.line, endLine, source: 'inline', valid: true };
    if (!ruleId) {
      ex.valid = false;
      ex.problem = 'craft-allow comment names no rule id. Use: craft-allow <rule-id>: <reason>.';
    } else if (!knownRules.has(ruleId)) {
      ex.valid = false;
      ex.problem = `craft-allow names unknown rule "${ruleId}".`;
    } else if (reason.split(/\s+/).filter(Boolean).length < 2) {
      ex.valid = false;
      ex.problem = `craft-allow ${ruleId} has no reason. Add one after the colon: why this is right for this product.`;
    }
    out.push(ex);
  }
  return out;
}

/**
 * @param {{ rule: string, glob: string, reason: string }[]} configExceptions
 * @returns {(ruleId: string, file: string) => { rule: string, glob: string, reason: string } | undefined}
 */
export function configMatcher(configExceptions) {
  const compiled = configExceptions.map((e) => ({ ...e, re: globToRegExp(e.glob) }));
  return (ruleId, file) => compiled.find((e) => e.rule === ruleId && e.re.test(file));
}
