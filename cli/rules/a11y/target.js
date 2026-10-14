/** Rendered-only rule: measured by craft shoot at the touch viewport (375px). */
/** @type {import('../types.js').Rule} */
export default {
  id: 'a11y/target',
  description: 'Rendered interactive targets smaller than 44x44px on touch layouts (below 24x24px is blocking).',
  severity: 'warn',
  confidence: 0.9,
  tier: 'T2'
};
