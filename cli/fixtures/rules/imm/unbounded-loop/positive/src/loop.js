import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();
function tick() {
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
