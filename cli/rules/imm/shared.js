// Detection shared by the immersive rules.

export const WEBGL_IMPORT = /^(three|three\/.*|@react-three\/fiber|@react-three\/drei|pixi\.js|@pixi\/.*|babylonjs|@babylonjs\/.*|ogl|regl|playcanvas|@splinetool\/.*|p5|twgl\.js)$/;

/**
 * @param {import('../types.js').Document} doc
 * @returns {boolean}
 */
export function usesWebGL(doc) {
  if (doc.isTest || doc.kind === 'css') return false;
  if (doc.imports.some((i) => WEBGL_IMPORT.test(i))) return true;
  return /getContext\(\s*['"](webgl2?|experimental-webgl|webgpu)['"]/.test(doc.scripts.join('\n'));
}

/**
 * @param {import('../types.js').Document} doc
 * @returns {boolean}
 */
export function usesCanvas2d(doc) {
  return !doc.isTest && /getContext\(\s*['"]2d['"]/.test(doc.scripts.join('\n'));
}
