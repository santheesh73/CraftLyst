/** Rendered-only rule: measured by craft shoot at the touch viewport (375px). */
/** @type {import('../types.js').Rule} */
export default {
  id: 'a11y/target',
  description: 'Rendered interactive targets under the 44x44px touch recommendation (info); under the WCAG 2.5.8 24x24px minimum, axe target-size reports it as blocking.',
  severity: 'info',
  confidence: 0.9,
  tier: 'T2'
};
