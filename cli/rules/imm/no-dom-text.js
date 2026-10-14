import { usesWebGL, usesCanvas2d } from './shared.js';

const CANVAS_TEXT = /fillText\(|strokeText\(|<Text[\s>]|<Text3D|TextGeometry|troika-three-text|<Html[\s>]/;
const DOM_ALT = /aria-label|aria-describedby|sr-only|visually-hidden|<h[1-6][\s>]|<p[\s>]|role\s*=\s*['"]img['"]|<figcaption/;

/** @type {import('../types.js').Rule} */
export default {
  id: 'imm/no-dom-text',
  description: 'Meaningful text rendered inside canvas/WebGL without a DOM text alternative.',
  severity: 'warn',
  confidence: 0.5,
  tier: 'T0',
  check(ctx) {
    /** @type {import('../types.js').RawFinding[]} */
    const out = [];
    for (const doc of ctx.docs) {
      if (!(usesWebGL(doc) || usesCanvas2d(doc))) continue;
      if (CANVAS_TEXT.test(doc.source) && !DOM_ALT.test(doc.source)) {
        out.push({ file: doc.file, line: 1, message: 'Text is drawn inside a canvas/WebGL scene with no DOM alternative in this file.', remediation: 'Render the same headings and text in the DOM (visually hidden if needed), or label the canvas with role="img" and aria-label.' });
      }
      for (const el of doc.all) {
        if ((el.tag === 'canvas' || el.tag === 'Canvas') && !('aria-hidden' in el.attrs) && !('aria-label' in el.attrs) && !('role' in el.attrs) && !CANVAS_TEXT.test(doc.source)) {
          out.push({ file: doc.file, line: el.line, message: `<${el.tag}> has no aria-hidden, role, or aria-label.`, remediation: 'Mark decorative canvases aria-hidden="true"; give meaningful ones role="img" and an aria-label plus a DOM text alternative.', confidence: 0.45, severity: 'info' });
        }
      }
    }
    return out;
  }
};
