/** Produced by the lint engine while collecting exceptions (see cli/src/exceptions.js). */
/** @type {import('../types.js').Rule} */
export default {
  id: 'exc/unreasoned',
  description: 'A craft-allow exception without a rule id or a reason, or naming an unknown rule.',
  severity: 'block',
  confidence: 1,
  tier: 'T0'
};
