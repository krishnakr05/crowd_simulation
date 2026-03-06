import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Agent from "./agent.js";
import { createBuilding } from "./building.js";
import FlowField from "./FlowField.js";
import { initGestureEmergency } from "./gestureemergency.js";

/* ── SCENE ───────────────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060e18);

const camera = new THREE.OrthographicCamera(-50, 50, 30, -30, 1, 100);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ── BUILDING ────────────────────────────────────────────────────── */
const { walls, doors, exit, exitMesh, exitGlow } = createBuilding(scene);
const flowField = new FlowField(exit, doors);

/* ── EMERGENCY FLASH OVERLAY ─────────────────────────────────────── */
const flashGeo = new THREE.PlaneGeometry(100, 60);
const flashMat = new THREE.MeshBasicMaterial({
color: 0xff2200,
transparent: true,
opacity: 0,
});

const flashMesh = new THREE.Mesh(flashGeo, flashMat);
flashMesh.position.set(0, 0, 10);
flashMesh.renderOrder = 99;
scene.add(flashMesh);

/* ── ALARM PULSE RINGS ───────────────────────────────────────────── */
const pulseRings = [];

function createPulseRing() {
const ring = new THREE.Mesh(
new THREE.RingGeometry(0.5, 1.2, 32),
new THREE.MeshBasicMaterial({
color: 0xff4400,
transparent: true,
opacity: 0.8,
side: THREE.DoubleSide,
})
);

ring.position.set(exit.x, exit.y, 0.5);
ring._age = 0;

scene.add(ring);
pulseRings.push(ring);
}

/* ── HUD ─────────────────────────────────────────────────────────── */
const hud = document.createElement("div");

hud.style.cssText = `position:fixed;
top:0;
left:0;
width:100%;
pointer-events:none;
font-family:monospace;
color:#00ffcc;
padding:18px 24px;`;

hud.innerHTML = `

<div id="status">STATUS: NORMAL</div>
<div style="font-size:20px;margin-top:4px;">
AGENTS: <span id="agentCount">150</span> / 150
</div>
<div id="evacuated" style="opacity:0;color:#00ff88;margin-top:4px;">
EVACUATED: <span id="evacCount">0</span>
</div>
`;

document.body.appendChild(hud);

/* ── CLICK / GESTURE HINT ────────────────────────────────────────── */
const clickHint = document.createElement("div");

clickHint.style.cssText = `position:fixed;
bottom:32px;
left:50%;
transform:translateX(-50%);
font-family:monospace;
color:#00ffcc;
font-size:13px;
letter-spacing:0.15em;
opacity:0.6;`;

clickHint.textContent = "[ CLICK OR RAISE PALM TO TRIGGER EMERGENCY ]";
document.body.appendChild(clickHint);

/* ── AGENTS ──────────────────────────────────────────────────────── */
const agents = [];

function randomPosition() {

const rooms = [
[-25, 10], [10, 10],
[-25, 0], [10, 0],
[-25, -10], [10, -10],
];

const r = rooms[Math.floor(Math.random() * rooms.length)];

return new THREE.Vector2(
r[0] + Math.random() * 10,
r[1] + Math.random() * 6
);
}

for (let i = 0; i < 150; i++) {
const agent = new Agent(randomPosition(), doors, exit);
agent.addToScene(scene);
agents.push(agent);
}

/* ── STATE ───────────────────────────────────────────────────────── */
let emergency = false;
let flashOpacity = 0;
let pulseTimer = 0;
let time = 0;

/* ── SHARED EMERGENCY TRIGGER ────────────────────────────────────── */
function triggerEmergency() {

if (emergency) return;

emergency = true;
flashOpacity = 0.45;

clickHint.style.display = "none";

document.getElementById("status").textContent = "⚠ STATUS: EMERGENCY";
document.getElementById("status").style.color = "#ff4400";

document.getElementById("evacuated").style.opacity = "1";
}

/* ── MOUSE TRIGGER ───────────────────────────────────────────────── */
window.addEventListener("click", triggerEmergency);

/* ── GESTURE TRIGGER ─────────────────────────────────────────────── */
initGestureEmergency(triggerEmergency);

/* ── ANIMATION LOOP ──────────────────────────────────────────────── */
function animate() {

requestAnimationFrame(animate);
time++;

agents.forEach((a) => a.update(agents, walls, flowField, emergency));

const alive = agents.filter((a) => !a.evacuated).length;
const evacuated = 150 - alive;

document.getElementById("agentCount").textContent = alive;
document.getElementById("evacCount").textContent = evacuated;

if (flashOpacity > 0) {
flashOpacity -= 0.012;
flashMat.opacity = Math.max(0, flashOpacity);
}

if (emergency) {

```
pulseTimer++;

if (pulseTimer % 60 === 0) createPulseRing();

exitGlow.material.opacity = 0.1 + 0.1 * Math.sin(time * 0.08);
```

}

for (let i = pulseRings.length - 1; i >= 0; i--) {

```
const ring = pulseRings[i];

ring._age += 0.025;

const scale = 1 + ring._age * 18;

ring.scale.set(scale, scale, 1);

ring.material.opacity = Math.max(0, 0.6 * (1 - ring._age));

if (ring._age >= 1) {
  scene.remove(ring);
  pulseRings.splice(i, 1);
}
```

}

renderer.render(scene, camera);
}

animate();
