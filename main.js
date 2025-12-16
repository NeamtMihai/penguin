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
// Trees (simple low-poly)
// --------------------
const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });

const leavesGeo = new THREE.ConeGeometry(1.2, 2.5, 8);
const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });

for (let i = 0; i < 25; i++) {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1;
  tree.add(trunk);

  const leaves = new THREE.Mesh(leavesGeo, leavesMat);
  leaves.position.y = 3;
  tree.add(leaves);

  tree.position.set(
    (Math.random() - 0.5) * 80,
    0,
    (Math.random() - 0.5) * 80
  );

  scene.add(tree);
}


// --------------------
// Input (keyboard)
// --------------------
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// --------------------
// Mouse camera
// --------------------
let yaw = 0;
let pitch = 0;
let mouseDown = false;

// Zoom
let cameraDistance = 8;
let targetCameraDistance = 8;
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 15;

window.addEventListener('wheel', e => {
    targetCameraDistance += e.deltaY * 0.01;
    targetCameraDistance = Math.max(
        MIN_DISTANCE,
        Math.min(MAX_DISTANCE, targetCameraDistance)
    );
});

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
// Click-to-move + Marker
// --------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let clickTarget = null;

const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);

const uiBar = document.getElementById('ui-bar');

window.addEventListener('mousedown', e => {
    if (e.button !== 0) return;

    // 🔹 NEW: ignore clicks on UI bar
    if (uiBar && uiBar.contains(e.target)) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(ground);

    if (hits.length > 0) {
        clickTarget = hits[0].point.clone();
        marker.position.copy(clickTarget);
        marker.position.y = 0.05;
        marker.visible = true;
    }
});

/* =====================
   CHAT SYSTEM
===================== */

const bubbleContainer = document.getElementById('chat-bubbles');
let bubble = null;
let bubbleTimer = 0;

function showBubble(text) {
    if (bubble) bubble.remove();
    bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerText = text;
    bubbleContainer.appendChild(bubble);
    bubbleTimer = 4;
}

const input = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

/* 🔹 NEW: chat focus tracking */
let chatFocused = false;

input.addEventListener('focus', () => {
    chatFocused = true;
});

input.addEventListener('blur', () => {
    chatFocused = false;
});

/* 🔹 NEW: Enter focuses chat if not already typing */
window.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !chatFocused) {
        input.focus();
        e.preventDefault();
    }
});

function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    showBubble(text);
    input.value = '';
}

sendBtn.onclick = sendMessage;
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
});

// --------------------
// Helpers
// --------------------
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// --------------------
// Game loop
// --------------------
function animate() {
    requestAnimationFrame(animate);

    const speed = 0.12;
    const moveDir = new THREE.Vector3();
    let moving = false;

    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));

    // 🔹 UPDATED: cancel click-to-move only if NOT typing
    if (!chatFocused && (keys['w'] || keys['a'] || keys['s'] || keys['d'])) {
        clickTarget = null;
        marker.visible = false;
    }

    // 🔹 UPDATED: WASD movement only if NOT typing
    if (!chatFocused) {
        if (keys['w']) { moveDir.add(forward.clone().multiplyScalar(-1)); moving = true; }
        if (keys['s']) { moveDir.add(forward); moving = true; }
        if (keys['a']) { moveDir.add(right.clone().multiplyScalar(-1)); moving = true; }
        if (keys['d']) { moveDir.add(right); moving = true; }

    }

    // Click-to-move
    if (!moving && clickTarget) {
        const toTarget = clickTarget.clone().sub(player.position);
        toTarget.y = 0;

        if (toTarget.length() > 0.2) {
            moveDir.copy(toTarget.normalize());
            moving = true;
        } else {
            clickTarget = null;
            marker.visible = false;
        }
    }

    // Apply movement + rotation
    if (moving) {
        player.position.addScaledVector(moveDir, speed);
        player.rotation.y = lerp(player.rotation.y, Math.atan2(moveDir.x, moveDir.z), 0.15);
    }

    // Smooth zoom
    cameraDistance = lerp(cameraDistance, targetCameraDistance, 0.1);

    const camPos = new THREE.Vector3(
        Math.sin(yaw) * cameraDistance,
        4 + pitch * 4,
        Math.cos(yaw) * cameraDistance
    ).add(player.position);

    camera.position.lerp(camPos, 0.1);
    camera.lookAt(player.position);

    // Bubble follow
    if (bubble) {
        bubbleTimer -= 1 / 60;
        if (bubbleTimer <= 0) {
            bubble.remove();
            bubble = null;
        } else {
            const head = player.position.clone();
            head.y += 2.5;
            head.project(camera);
            bubble.style.left = `${(head.x * 0.5 + 0.5) * window.innerWidth}px`;
            bubble.style.top = `${(-head.y * 0.5 + 0.5) * window.innerHeight}px`;
        }
    }

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

// --------------------
// Player color controls (UI)
// --------------------
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
        const color = dot.dataset.color;
        player.material.color.set(color);
    });
});
