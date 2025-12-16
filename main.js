import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

// --------------------
// Scene
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --------------------
// Camera
// --------------------
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// --------------------
// Renderer
// --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --------------------
// Lights
// --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// --------------------
// Ground
// --------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x228b22 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// --------------------
// Player
// --------------------
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 1),
  new THREE.MeshStandardMaterial({ color: 0x0000ff })
);
player.position.y = 1;
scene.add(player);

// --------------------
// Objects on ground
// --------------------
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

for (let i = 0; i < 50; i++) {
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(
    (Math.random() - 0.5) * 80,
    0.5,
    (Math.random() - 0.5) * 80
  );
  scene.add(box);
}

// --------------------
// Input
// --------------------
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Mouse camera
let mouseDown = false;
let yaw = 0;
let pitch = 0;

window.addEventListener('mousedown', e => {
  if (e.button === 2) mouseDown = true;
});
window.addEventListener('mouseup', () => mouseDown = false);
window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('mousemove', e => {
  if (!mouseDown) return;

  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;

  pitch = Math.max(-1.2, Math.min(0.3, pitch));
});

// --------------------
// Helpers
// --------------------
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// --------------------
// Game Loop
// --------------------
const cameraTarget = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  const speed = 0.12;
  let moving = false;

  // Camera-relative movement vectors
  const forward = new THREE.Vector3(
    Math.sin(yaw),
    0,
    Math.cos(yaw)
  );

  const right = new THREE.Vector3(
    Math.sin(yaw + Math.PI / 2),
    0,
    Math.cos(yaw + Math.PI / 2)
  );

  const moveDir = new THREE.Vector3();

  if (keys['w']) { moveDir.add(forward).multiplyScalar(-1); moving = true; }
  if (keys['s']) { moveDir.add(forward); moving = true; }
  if (keys['a']) { moveDir.add(right).multiplyScalar(-1); moving = true; }
  if (keys['d']) { moveDir.add(right); moving = true; }

  if (moveDir.length() > 0) {
    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);

    // A) Rotate player toward movement direction
    const targetRotation = Math.atan2(moveDir.x, moveDir.z);
    player.rotation.y = lerp(player.rotation.y, targetRotation, 0.15);
  }

  // B) Smooth camera follow
  const distance = 8;
  const desiredCameraPos = new THREE.Vector3(
    Math.sin(yaw) * distance,
    4 + pitch * 4,
    Math.cos(yaw) * distance
  ).add(player.position);

  camera.position.lerp(desiredCameraPos, 0.1);

  cameraTarget.copy(player.position);
  camera.lookAt(cameraTarget);

  renderer.render(scene, camera);
}

animate();

// --------------------
// Resize
// --------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
