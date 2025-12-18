import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
const SUPABASE_URL = 'https://rkqeuzipsxjabfnhytlg.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_6Ka6cIBxZgvXFPE7uuCdpw_USMpv1vx'

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

export async function startGame(user) {
    // --------------------
    // Scene
    // --------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 80);

    // --------------------
    // Player
    // --------------------
    const player = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2, 1),
        new THREE.MeshStandardMaterial({ color: 0x0000ff })
    );
    player.position.y = 1;
    scene.add(player);


    // 🐧 MULTIPLAYER ADD
    const otherPlayers = new Map();
    let lastSync = 0;
    // 🐧 MULTIPLAYER ADD
    let lastSentPosition = new THREE.Vector3();


    // 🐧 MULTIPLAYER ADD
    function createRemotePlayer(color = '#ff0000') {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color })
        );
        mesh.position.y = 50;
        mesh.position.z = 30;

        scene.add(mesh);
        return mesh;
    }

    // 🐧 MULTIPLAYER ADD
    async function ensureProfile() {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!data) {
            await supabase.from('profiles').insert({
                id: user.id,
                x: player.position.x,
                y: player.position.y,
                z: player.position.z,
                color: '#0000ff',
            });
        } else {
            // restore position + color
            player.position.set(data.x, data.y, data.z);
            player.material.color.set(data.color);
        }
    }

    await ensureProfile();
    // 🐧 MULTIPLAYER FIX
    lastSentPosition.copy(player.position);


    // 🐧 MULTIPLAYER ADD
    const { data: players } = await supabase
        .from('profiles')
        .select('*');

    players.forEach(p => {
        if (p.id === user.id) return;

        const mesh = createRemotePlayer(p.color);
        mesh.position.set(p.x, p.y, p.z);
        otherPlayers.set(p.id, mesh);
    });

    // 🐧 MULTIPLAYER ADD
    supabase
        .channel('players')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
            payload => {
                const p = payload.new;
                if (!p || p.id === user.id) return;

                let mesh = otherPlayers.get(p.id);

                if (!mesh) {
                    mesh = createRemotePlayer(p.color);
                    otherPlayers.set(p.id, mesh);
                }

                mesh.position.set(p.x, p.y, p.z);
                mesh.material.color.set(p.color)
            }
        )
        .subscribe();





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
    // Objects on ground
    // --------------------
    const boxes = []
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

    for (let i = 0; i < 50; i++) {
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(
            (Math.random() - 0.5) * 80,
            0.5,
            (Math.random() - 0.5) * 80
        );
        boxes.push(box);
        scene.add(box);
    }

    // --------------------
    // Trees (simple low-poly)
    // --------------------
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });

    const leavesGeo = new THREE.ConeGeometry(1.2, 2.5, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
    const trees = [];

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

        // 🔹 NEW: vary tree size
        const scale = 0.7 + Math.random() * 2.8;
        tree.scale.set(scale, scale, scale);


        trees.push(tree);
        scene.add(tree);

    }

    // --------------------
    // Beach elements (initially hidden)
    // --------------------
    const sandMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d16b });
    const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const grassMaterial = ground.material;

    const water = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({
            color: 0x4fc3f7,
            transparent: true,
            opacity: 0.8
        })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(25, 0.03, 25);
    water.visible = false;
    scene.add(water);


    // --------------------
    // Environment toggle
    // --------------------
    let isBeach = false;
    const envBtn = document.getElementById('env-toggle');

    envBtn.addEventListener('click', () => {
        isBeach = !isBeach;

        if (isBeach) {
            // BEACH 🌴
            ground.material = sandMaterial;
            scene.background.set(0x87cefa);
            scene.fog.color.set(0x87cefa);

            trees.forEach(t => t.visible = false);
            boxes.forEach(b => b.visible = false);
            water.visible = true;

            envBtn.textContent = 'Forest 🌲';
        } else {
            // FOREST 🌲
            ground.material = grassMaterial;
            scene.background.set(0x87ceeb);
            scene.fog.color.set(0x87ceeb);

            trees.forEach(t => t.visible = true);
            water.visible = false;

            envBtn.textContent = 'Beach 🌴';
        }
    });

    // --------------------
    // Halloween pumpkins
    // --------------------
    const pumpkins = [];

    const pumpkinGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xff7a00 });

    for (let i = 0; i < 15; i++) {
        const pumpkin = new THREE.Mesh(pumpkinGeo, pumpkinMat);

        // 🎃 glowing face
        const face = new THREE.Mesh(
            new THREE.CircleGeometry(0.25, 12),
            new THREE.MeshBasicMaterial({
                color: 0xffcc66,
                transparent: true,
                opacity: 0.8
            })
        );
        face.position.z = 0.55;
        face.position.y = 0.1;
        pumpkin.add(face);

        pumpkin.position.set(
            (Math.random() - 0.5) * 80,
            0.6,
            (Math.random() - 0.5) * 80
        );
        pumpkin.visible = false;
        pumpkins.push(pumpkin);
        scene.add(pumpkin);
    }

    // --------------------
    // Christmas snowmen (improved)
    // --------------------
    const snowmen = [];

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xff7a00 });
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x6b4f2a });

    for (let i = 0; i < 10; i++) {
        const snowman = new THREE.Group();

        // Body (bottom → top)
        const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), snowMat);
        bottom.position.y = 0.8;
        snowman.add(bottom);

        const middle = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), snowMat);
        middle.position.y = 1.7;
        snowman.add(middle);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), snowMat);
        head.position.y = 2.45;
        snowman.add(head);

        // Eyes (coal)
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeo, coalMat);
        const rightEye = new THREE.Mesh(eyeGeo, coalMat);

        leftEye.position.set(-0.12, 2.5, 0.35);
        rightEye.position.set(0.12, 2.5, 0.35);

        snowman.add(leftEye, rightEye);

        // Nose (carrot)
        const nose = new THREE.Mesh(
            new THREE.ConeGeometry(0.06, 0.4, 8),
            carrotMat
        );
        nose.position.set(0, 2.4, 0.45);
        nose.rotation.x = Math.PI / 2;
        snowman.add(nose);

        // Buttons
        for (let b = 0; b < 3; b++) {
            const button = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 8, 8),
                coalMat
            );
            button.position.set(0, 1.7 - b * 0.25, 0.55);
            snowman.add(button);
        }

        // Arms (sticks)
        const armGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.2, 6);

        const leftArm = new THREE.Mesh(armGeo, stickMat);
        leftArm.position.set(-0.9, 1.8, 0);
        leftArm.rotation.z = Math.PI / 4;
        snowman.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, stickMat);
        rightArm.position.set(0.9, 1.8, 0);
        rightArm.rotation.z = -Math.PI / 4;
        snowman.add(rightArm);

        // Placement + variation
        snowman.position.set(
            (Math.random() - 0.5) * 80,
            0,
            (Math.random() - 0.5) * 80
        );

        snowman.rotation.y = Math.random() * Math.PI * 2;
        snowman.scale.setScalar(0.9 + Math.random() * 0.3);

        snowman.visible = false;
        snowmen.push(snowman);
        scene.add(snowman);
    }
    // --------------------
    // Christmas festive light
    // --------------------
    const christmasLight = new THREE.PointLight(0xffffff, 0, 20);
    christmasLight.position.set(0, 6, 0);
    scene.add(christmasLight);


    // --------------------
    // Halloween event toggle
    // --------------------
    let isHalloween = false;
    const eventBtn = document.getElementById('event-toggle');

    const normalFogColor = scene.fog.color.clone();
    const normalLightIntensity = dirLight.intensity;

    eventBtn.addEventListener('click', () => {
        isHalloween = !isHalloween;

        if (isHalloween) {
            // 🎃 HALLOWEEN ON
            scene.background.set(0x2b1b3a);
            scene.fog.color.set(0x2b1b3a);

            dirLight.intensity = 0.6;

            trees.forEach(t => {
                t.children[1].material.color.set(0x4b2e83); // spooky leaves
            });

            pumpkins.forEach(p => p.visible = true);

            eventBtn.textContent = 'Halloween 🎃 (ON)';
        } else {
            // 🎃 HALLOWEEN OFF
            scene.background.copy(normalFogColor);
            scene.fog.color.copy(normalFogColor);

            dirLight.intensity = normalLightIntensity;

            trees.forEach(t => {
                t.children[1].material.color.set(0x2e8b57); // normal leaves
            });

            pumpkins.forEach(p => p.visible = false);

            eventBtn.textContent = 'Halloween 🎃';
        }
    });
    // --------------------
    // Christmas event toggle
    // --------------------
    let isChristmas = false;
    const christmasBtn = document.getElementById('christmas-toggle');

    const christmasFogColor = new THREE.Color(0xe0f6ff);

    christmasBtn.addEventListener('click', () => {
        isChristmas = !isChristmas;

        // ❗ Turn off Halloween if active
        if (isChristmas && isHalloween) {
            eventBtn.click();
        }

        if (isChristmas) {
            // 🎄 CHRISTMAS ON
            scene.background.copy(christmasFogColor);
            scene.fog.color.copy(christmasFogColor);
            ground.material = snowMaterial;

            dirLight.intensity = 0.9;
            christmasLight.intensity = 0.6;

            // Snowy trees
            trees.forEach(t => {
                t.children[1].material.color.set(0xffffff);
            });

            snowmen.forEach(s => s.visible = true);

            christmasBtn.textContent = 'Christmas 🎄 (ON)';
        } else {
            // 🎄 CHRISTMAS OFF
            scene.background.set(0x87ceeb);
            scene.fog.color.set(0x87ceeb);

            christmasLight.intensity = 0;

            trees.forEach(t => {
                t.children[1].material.color.set(0x2e8b57);
            });


            snowmen.forEach(s => s.visible = false);

            christmasBtn.textContent = 'Christmas 🎄';
        }
    });


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
        bubbleTimer = 20;
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
        // 🐧 MULTIPLAYER ADD
        syncPosition();

        requestAnimationFrame(animate);
        // 🐧 MULTIPLAYER ADD
        async function syncPosition() {
            const now = performance.now();
            if (now - lastSync < 100) return;

            // 🔹 only sync if position actually changed
            if (player.position.distanceToSquared(lastSentPosition) < 0.0001) return;

            lastSync = now;
            lastSentPosition.copy(player.position);

            const { data, error } = await supabase
                .from('profiles')
                .update({
                    x: player.position.x,
                    y: player.position.y,
                    z: player.position.z,
                    color: player.material.color.getStyle(),
                    updated_at: new Date(),
                })
                .eq('id', user.id);

            if (error) {
                console.error('Supabase update error:', error);
            }

        }



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
            syncPosition();

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
}