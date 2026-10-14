import { visualTraits } from '../../src/rule-helpers.js';

/** @type {import('../types.js').Rule} */
export default {
  id: 'vis/default-stack',
  description: 'Most components share one large radius plus shadow, or every button is a pill, with no contract reason.',
  severity: 'info',
  confidence: 0.5,
  tier: 'T0',
  check(ctx) {
    // A soft shape language in the contract is the token-role justification this rule asks for.
    if (/soft/.test(ctx.axes.shape ?? '')) return [];
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    let styled = 0;
    let stacked = 0;
    /** @type {{ file: string, line: number } | null} */
    let first = null;
    let buttons = 0;
    let pills = 0;
    /** @type {{ file: string, line: number } | null} */
    let firstPill = null;
    for (const doc of ctx.docs) {
      if (doc.isTest) continue;
      for (const el of doc.all) {
        const t = visualTraits(el, ctx.classes);
        if (t.radius !== null && t.radius > 0) {
          styled++;
          if (t.radius >= 12 && t.shadow) {
            stacked++;
            first ??= { file: doc.file, line: el.line };
          }
        }
        if (el.tag === 'button' || el.tag === 'Button' || el.attrs.role?.value === 'button') {
          buttons++;
          if (t.pill) {
            pills++;
            firstPill ??= { file: doc.file, line: el.line };
          }
        }
      }
    }
    if (styled >= 5 && first && stacked / styled >= ctx.thresholds.defaultStackShare) {
      out.push({ ...first, message: `${stacked} of ${styled} rounded elements (${Math.round((stacked / styled) * 100)}%) use a 12px+ radius with a shadow.`, remediation: 'Derive radius and elevation from the shape and contrast axes; differentiate controls from containers. If soft shapes are intended, record "Shape language: soft" in DESIGN.md.' });
    }
    if (buttons >= 3 && firstPill && pills === buttons) {
      out.push({ ...firstPill, message: `All ${buttons} buttons are pill-shaped.`, remediation: 'Use the control radius token; reserve pills for tags or toggles unless the direction calls for soft shapes.' });
    }
    return out;
  }
};
