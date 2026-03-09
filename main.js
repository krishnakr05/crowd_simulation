import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Agent from "./agent.js";
import { createSymmetricLayout, createCourtyardLayout, createOfficeLayout } from "./building.js";
import FlowField from "./FlowField.js";

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
  position:fixed; top:0; left:0; width:100%; pointer-events:none;
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

/* ── WAYPOINT GENERATION ─────────────────────────────────────────── */
// Waypoints are defined explicitly in each layout alongside doors.
// Each waypoint is a safe point inside the corridor just past the door,
// guaranteed not to be inside any wall or corner exit zone.
// If a layout provides waypoints, use them directly.
// Otherwise fall back to computing from room geometry.
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
function resetSimulation(layoutFn) {
  // Remove old agent meshes
  agents.forEach((a) => {
    scene.remove(a.mesh);
    a.trailMeshes.forEach((m) => scene.remove(m));
  });
  agents = [];

  // Remove old building meshes and walls
  if (currentLayout) {
    currentLayout.walls.forEach((w) => scene.remove(w.mesh));
    currentLayout.meshes.forEach((m) => scene.remove(m));
    currentLayout.exits.forEach((e) => {
      scene.remove(e.bar);
      scene.remove(e.glow);
    });
  }

  // Remove pulse rings
  pulseRings.forEach((r) => scene.remove(r));
  pulseRings.length = 0;

  // Build new layout
  currentLayout = layoutFn(scene);
  walls = currentLayout.walls;

  // Adjust camera for layout
  if (currentLayout.name === 'courtyard') {
    camera.left = -60; camera.right = 60;
    camera.top = 38;   camera.bottom = -38;
  } else if (currentLayout.name === 'office') {
    camera.left = -50; camera.right = 50;
    camera.top = 32;   camera.bottom = -32;
  } else {
    camera.left = -50; camera.right = 50;
    camera.top = 30;   camera.bottom = -30;
  }
  camera.updateProjectionMatrix();

  // Generate waypoints
  const waypoints = generateWaypoints(currentLayout.doors, currentLayout.rooms, currentLayout.waypoints);

  // Build FlowField
  flowField = new FlowField(
    currentLayout.exits,
    currentLayout.doors,
    currentLayout.rooms,
    waypoints
  );

  // Spawn agents
  totalAgents = 150;
  document.getElementById("agentTotal").textContent = totalAgents;

  for (let i = 0; i < totalAgents; i++) {
    const pos = randomSpawnPosition(currentLayout.spawnZones);
    const agent = new Agent(pos, currentLayout.doors, currentLayout.exits);
    agent.addToScene(scene);
    agents.push(agent);
  }

  // Reset state
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

  // Reset exit colors to green
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

  // Randomly block one exit
  const blockedIdx = Math.floor(Math.random() * currentLayout.exits.length);
  flowField.setBlockedExit(blockedIdx);

  // Show blocked exit in red, keep others green
  currentLayout.exits.forEach((e, i) => {
    if (i === blockedIdx) {
      e.bar.material.color.setHex(0xff2200);
      e.glow.material.color.setHex(0xff2200);
    }
  });

  document.getElementById("blockedNotice").style.opacity = "1";

  // Pulse rings from all open exits
  currentLayout.exits.forEach((e, i) => {
    if (i !== blockedIdx) createPulseRing(e.pos.x, e.pos.y);
  });
}

window.addEventListener("click", () => triggerEmergency());

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
    agents.forEach((a) => a.update(agents, walls, flowField, emergency));
  }

  const alive = agents.filter((a) => !a.evacuated).length;
  document.getElementById("agentCount").textContent = alive;
  document.getElementById("evacCount").textContent = totalAgents - alive;

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
animate();