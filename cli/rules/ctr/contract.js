import { checkContract } from '../../src/contract.js';

/** @type {import('../types.js').Rule} */
export default {
  id: 'ctr/contract',
  description: 'DESIGN.md missing sections, axes, or reasons, or over 150 lines; tokens.json invalid or with unresolved references.',
  severity: 'block',
  confidence: 1,
  tier: 'T0',
  check(ctx) {
    // No .craft/ at all is allowed for small changes (SKILL.md triage), so it is informational;
    // a contract that exists but is broken is blocking.
    return checkContract(ctx.root).findings.map((f) => ({
      file: f.file, line: f.line, message: f.message, remediation: f.remediation, confidence: f.confidence,
      severity: f.file === '.craft/' ? 'info' : f.severity
    }));
  }
};
