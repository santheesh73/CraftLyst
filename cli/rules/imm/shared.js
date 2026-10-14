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

/** Code that creates a renderer or WebGL context (where fallbacks and loop policy belong). */
const CREATES_SCENE = /<Canvas[\s>]|new\s+(THREE\.)?WebGL(1)?Renderer\(|new\s+(THREE\.)?WebGPURenderer\(|getContext\(\s*['"](webgl2?|experimental-webgl|webgpu)['"]|new\s+(PIXI\.)?Application\(|new\s+(BABYLON\.)?Engine\(|new\s+Renderer\(|createREGL\(|<Spline[\s>]/;

/**
 * Does this file create the scene (Canvas, renderer, context), not just add objects to one?
 * @param {import('../types.js').Document} doc
 * @returns {boolean}
 */
export function createsScene(doc) {
  return usesWebGL(doc) && CREATES_SCENE.test(doc.scripts.join('\n') || doc.source);
}
