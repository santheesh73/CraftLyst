import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const clock = new THREE.Clock();
let id = 0;
function tick() {
  const delta = clock.getDelta();
  mesh.rotation.y += delta;
  renderer.render(scene, camera);
  id = requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(id);
  else id = requestAnimationFrame(tick);
});
id = requestAnimationFrame(tick);
