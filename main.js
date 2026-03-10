import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Agent from "./agent.js";
import { createSymmetricLayout, createCourtyardLayout, createOfficeLayout } from "./building.js";
import FlowField from "./FlowField.js";

/* ── SCENE ───────────────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060e18);

const camera = new THREE.OrthographicCamera(-50, 50, 30, -30, 1, 100);
camera.position.z = 50;

const PANEL_WIDTH = 210;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

function updateRendererSize() {
  const w = window.innerWidth - PANEL_WIDTH;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  // Recompute horizontal extent to match new aspect, keep vertical fixed
  const vHalf = camera.top;
  if (vHalf) {
    const aspect = w / h;
    camera.left   = -vHalf * aspect;
    camera.right  =  vHalf * aspect;
    camera.updateProjectionMatrix();
  }
}

window.addEventListener("resize", updateRendererSize);

/* ── EMERGENCY FLASH OVERLAY ─────────────────────────────────────── */
const flashMat = new THREE.MeshBasicMaterial({
  color: 0xff2200, transparent: true, opacity: 0,
});
const flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), flashMat);
flashMesh.position.set(0, 0, 10);
flashMesh.renderOrder = 99;
scene.add(flashMesh);

/* ── PULSE RINGS ─────────────────────────────────────────────────── */
const pulseRings = [];
function createPulseRing(x, y) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 1.2, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff4400, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
    })
  );
  ring.position.set(x, y, 0.5);
  ring._age = 0;
  scene.add(ring);
  pulseRings.push(ring);
}

/* ── HUD ─────────────────────────────────────────────────────────── */
const hud = document.createElement("div");
hud.style.cssText = `
  position:fixed; top:0; left:0; pointer-events:none;
  font-family:'Courier New',monospace; color:#00ffcc;
  padding:18px 24px; box-sizing:border-box;
`;
hud.innerHTML = `
  <div id="status" style="font-size:13px;letter-spacing:0.12em;opacity:0.7;">STATUS: NORMAL</div>
  <div style="font-size:22px;font-weight:bold;margin-top:4px;">
    AGENTS: <span id="agentCount">150</span> / <span id="agentTotal">150</span>
  </div>
  <div id="evacuated" style="font-size:13px;margin-top:2px;color:#00ff88;opacity:0;">
    EVACUATED: <span id="evacCount">0</span>
  </div>
  <div id="blockedNotice" style="font-size:12px;margin-top:4px;color:#ff4400;opacity:0;letter-spacing:0.1em;">
    ⚠ EXIT BLOCKED — AGENTS REROUTING
  </div>
`;
document.body.appendChild(hud);

const clickHint = document.createElement("div");
clickHint.id = "clickHint";
clickHint.style.cssText = `
  position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
  font-family:'Courier New',monospace; color:#00ffcc;
  font-size:13px; letter-spacing:0.15em; opacity:0.6;
  pointer-events:none; animation:blink 1.8s ease-in-out infinite;
  text-align:center; line-height:1.8;
`;
clickHint.innerHTML = `[ CLICK ANYWHERE TO TRIGGER EMERGENCY ]<br>
  <span style="font-size:11px;opacity:0.5;">or raise your open palm to camera</span>`;
document.body.appendChild(clickHint);

const blinkStyle = document.createElement("style");
blinkStyle.textContent = `@keyframes blink{0%,100%{opacity:0.6}50%{opacity:0.15}}`;
document.head.appendChild(blinkStyle);

/* ── SIMULATION STATE ────────────────────────────────────────────── */
let agents = [];
let walls = [];
let flowField = null;
let currentLayout = null;
let emergency = false;
let flashOpacity = 0;
let pulseTimer = 0;
let time = 0;
let totalAgents = 150;

// Interactivity controls (set by ui.js)
export let simSpeedMultiplier = 1.0;
export let targetAgentCount = 150;

export function setSpeedMultiplier(v) { simSpeedMultiplier = v; }
export function setTargetAgentCount(v) { targetAgentCount = v; }

/* ── WAYPOINT GENERATION ─────────────────────────────────────────── */
function generateWaypoints(doors, rooms, explicitWaypoints) {
  if (explicitWaypoints) return explicitWaypoints;
  return doors.map((door, doorIdx) => {
    const ownerRoom = rooms.find(
      (r) => !r.inCorridor && r.doorIndices.includes(doorIdx)
    );
    if (!ownerRoom) return door.clone();
    const roomCX = (ownerRoom.xMin + ownerRoom.xMax) / 2;
    const roomCY = (ownerRoom.yMin + ownerRoom.yMax) / 2;
    const toDoor = door.clone().sub(new THREE.Vector2(roomCX, roomCY)).normalize();
    return door.clone().add(toDoor.multiplyScalar(3));
  });
}

/* ── BUILD + RESET ───────────────────────────────────────────────── */
export function resetSimulation(layoutFn) {
  agents.forEach((a) => {
    scene.remove(a.mesh);
    a.trailMeshes.forEach((m) => scene.remove(m));
  });
  agents = [];

  if (currentLayout) {
    currentLayout.walls.forEach((w) => scene.remove(w.mesh));
    currentLayout.meshes.forEach((m) => scene.remove(m));
    currentLayout.exits.forEach((e) => {
      scene.remove(e.bar);
      scene.remove(e.glow);
    });
  }

  pulseRings.forEach((r) => scene.remove(r));
  pulseRings.length = 0;

  currentLayout = layoutFn(scene);
  walls = currentLayout.walls;

  // Set camera vertical extent per layout, then derive horizontal from aspect
  let vHalf; // half-height in world units
  if (currentLayout.name === 'courtyard') {
    vHalf = 40;
  } else if (currentLayout.name === 'office') {
    vHalf = 38;
  } else {
    vHalf = 34; // symmetric
  }
  const aspect = (window.innerWidth - PANEL_WIDTH) / window.innerHeight;
  camera.left   = -vHalf * aspect;
  camera.right  =  vHalf * aspect;
  camera.top    =  vHalf;
  camera.bottom = -vHalf;
  camera.updateProjectionMatrix();

  const waypoints = generateWaypoints(currentLayout.doors, currentLayout.rooms, currentLayout.waypoints);

  flowField = new FlowField(
    currentLayout.exits,
    currentLayout.doors,
    currentLayout.rooms,
    waypoints
  );

  totalAgents = targetAgentCount;
  document.getElementById("agentTotal").textContent = totalAgents;

  // Outer wall coordinates per layout — agents can only cross these at door gaps
  const buildingBounds = {
    symmetric: { xMin: -30, xMax: 30, yMin: -20, yMax: 20 },
    courtyard: { xMin: -40, xMax: 40, yMin: -25, yMax: 25 },
    office:    { xMin: -40, xMax: 40, yMin: -25, yMax: 25 },
  }[currentLayout.name] || { xMin: -30, xMax: 30, yMin: -20, yMax: 20 };

  for (let i = 0; i < totalAgents; i++) {
    const pos = randomSpawnPosition(currentLayout.spawnZones);
    const agent = new Agent(pos, currentLayout.doors, currentLayout.exits);
    agent.buildingBounds = buildingBounds;
    agent.addToScene(scene);
    agents.push(agent);
  }

  emergency = false;
  flashOpacity = 0;
  pulseTimer = 0;
  time = 0;
  flashMat.opacity = 0;

  const hint = document.getElementById("clickHint");
  if (hint) { hint.style.display = "block"; }
  document.getElementById("status").textContent = "STATUS: NORMAL";
  document.getElementById("status").style.color = "#00ffcc";
  document.getElementById("evacuated").style.opacity = "0";
  document.getElementById("blockedNotice").style.opacity = "0";
  document.getElementById("agentCount").textContent = totalAgents;
  document.getElementById("evacCount").textContent = "0";

  currentLayout.exits.forEach((e) => {
    e.bar.material.color.setHex(0x00ff88);
    e.glow.material.color.setHex(0x00ff44);
  });
}

function randomSpawnPosition(spawnZones) {
  const z = spawnZones[Math.floor(Math.random() * spawnZones.length)];
  return new THREE.Vector2(
    z.cx + (Math.random() - 0.5) * z.w,
    z.cy + (Math.random() - 0.5) * z.h
  );
}

/* ── TRIGGER EMERGENCY ───────────────────────────────────────────── */
export function triggerEmergency() {
  if (emergency || !currentLayout) return;
  emergency = true;
  flashOpacity = 0.45;

  const hint = document.getElementById("clickHint");
  if (hint) hint.style.display = "none";

  document.getElementById("status").textContent = "⚠ STATUS: EMERGENCY";
  document.getElementById("status").style.color = "#ff4400";
  document.getElementById("evacuated").style.opacity = "1";

  // Start with no blocked exit — UI controls which exit is blocked
  flowField.setBlockedExit(-1);

  document.getElementById("blockedNotice").style.opacity = "0";

  // Pulse rings from all exits
  currentLayout.exits.forEach((e) => createPulseRing(e.pos.x, e.pos.y));

  // Notify ui.js that emergency started so it can refresh exit buttons
  window.dispatchEvent(new CustomEvent('emergencyStarted'));
}

/* ── BLOCK / UNBLOCK EXIT (called from ui.js) ────────────────────── */
export function setBlockedExit(index) {
  if (!flowField || !currentLayout) return;
  const prev = flowField.blockedExitIndex;
  flowField.setBlockedExit(index);

  // Reset ALL agent nav states so they recompute routes with new exit availability
  agents.forEach(a => {
    if (!a.evacuated) a.resetNavState();
  });

  // Update exit visual colors
  currentLayout.exits.forEach((e, i) => {
    const isBlocked = (i === index);
    e.bar.material.color.setHex(isBlocked ? 0xff2200 : 0x00ff88);
    e.glow.material.color.setHex(isBlocked ? 0xff2200 : 0x00ff44);
  });

  // Show/hide blocked notice
  if (index >= 0) {
    document.getElementById("blockedNotice").style.opacity = "1";
    // Pulse from open exits
    currentLayout.exits.forEach((e, i) => {
      if (i !== index) createPulseRing(e.pos.x, e.pos.y);
    });
  } else {
    document.getElementById("blockedNotice").style.opacity = "0";
    // Pulse from all exits (all open)
    currentLayout.exits.forEach((e) => createPulseRing(e.pos.x, e.pos.y));
  }
}

/* ── GET CURRENT LAYOUT EXITS (for ui.js) ───────────────────────── */
export function getExitCount() {
  return currentLayout ? currentLayout.exits.length : 0;
}
export function getBlockedExitIndex() {
  return flowField ? flowField.blockedExitIndex : -1;
}
export function isEmergency() { return emergency; }

window.addEventListener("click", (e) => {
  // Don't trigger if clicking on UI panels
  if (e.target.closest && e.target.closest('[data-no-emergency]')) return;
  triggerEmergency();
});

/* ── LAYOUT SWITCHER API (called from ui.js) ─────────────────────── */
export function switchLayout(name) {
  const map = {
    symmetric: createSymmetricLayout,
    courtyard: createCourtyardLayout,
    office:    createOfficeLayout,
  };
  if (map[name]) resetSimulation(map[name]);
}

/* ── ANIMATE ─────────────────────────────────────────────────────── */
function animate() {
  requestAnimationFrame(animate);
  time++;

  if (agents.length && flowField) {
    agents.forEach((a) => a.update(agents, walls, flowField, emergency, simSpeedMultiplier));
  }

  const alive = agents.filter((a) => !a.evacuated).length;
  const fullyEvacuated = agents.filter((a) => a.evacuated).length;
  document.getElementById("agentCount").textContent = alive;
  document.getElementById("evacCount").textContent = fullyEvacuated;

  if (flashOpacity > 0) {
    flashOpacity -= 0.012;
    flashMat.opacity = Math.max(0, flashOpacity);
  }

  if (emergency && currentLayout) {
    pulseTimer++;
    if (pulseTimer % 60 === 0) {
      const blockedIdx = flowField.blockedExitIndex;
      currentLayout.exits.forEach((e, i) => {
        if (i !== blockedIdx) createPulseRing(e.pos.x, e.pos.y);
      });
    }
    currentLayout.exits.forEach((e, i) => {
      if (i !== flowField.blockedExitIndex) {
        e.glow.material.opacity = 0.1 + 0.1 * Math.sin(time * 0.08);
      }
    });
  }

  for (let i = pulseRings.length - 1; i >= 0; i--) {
    const ring = pulseRings[i];
    ring._age += 0.025;
    ring.scale.set(1 + ring._age * 18, 1 + ring._age * 18, 1);
    ring.material.opacity = Math.max(0, 0.6 * (1 - ring._age));
    if (ring._age >= 1) { scene.remove(ring); pulseRings.splice(i, 1); }
  }

  renderer.render(scene, camera);
}

/* ── INIT ────────────────────────────────────────────────────────── */
resetSimulation(createSymmetricLayout);
updateRendererSize();
animate();