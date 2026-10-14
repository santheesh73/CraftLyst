import * as THREE from 'three';

const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
if (!gl) {
  document.querySelector('#hero-fallback').hidden = false;
} else {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  if (!reduce) renderer.setAnimationLoop(() => renderer.render(new THREE.Scene(), new THREE.PerspectiveCamera()));
}
