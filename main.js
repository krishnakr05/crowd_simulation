import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Agent from "./agent.js";
import { createBuilding } from "./building.js";
import FlowField from "./FlowField.js";

/* ── SCENE ───────────────────────────────────────── */
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

/* ── BUILDING ────────────────────────────────────── */
const { walls, doors, exit, exitMesh, exitGlow } = createBuilding(scene);
let exitWall = null;
const flowField = new FlowField(exit, doors);

/* ── GLOBAL STATE ───────────────────────────────── */
let emergency = false;
let flashOpacity = 0;
let pulseTimer = 0;
let time = 0;

let simulationSpeed = 1;
window.exitBlocked = false;

/* ── FLASH OVERLAY ───────────────────────────────── */
const flashGeo = new THREE.PlaneGeometry(100, 60);
const flashMat = new THREE.MeshBasicMaterial({
  color: 0xff2200,
  transparent: true,
  opacity: 0,
});
const flashMesh = new THREE.Mesh(flashGeo, flashMat);
flashMesh.position.set(0, 0, 10);
scene.add(flashMesh);

/* ── HUD ───────────────────────────────────────── */
const hud = document.createElement("div");
hud.style.cssText = `
position:fixed;
top:0;
left:0;
font-family:'Courier New';
color:#00ffcc;
padding:20px;
`;

hud.innerHTML = `
<div id="status">STATUS: NORMAL</div>
<div>AGENTS: <span id="agentCount">150</span></div>
<div>EVACUATED: <span id="evacCount">0</span></div>
`;

document.body.appendChild(hud);

/* ── CONTROL PANEL ─────────────────────────────── */

const panel = document.createElement("div");

panel.style.cssText = `
position:fixed;
right:0;
top:0;
width:220px;
height:100%;
background:#081420;
border-left:1px solid #112233;
font-family:'Courier New';
color:#00ffcc;
padding:18px;
box-sizing:border-box;
`;

panel.innerHTML = `

<div style="font-size:14px;margin-bottom:14px">SIMULATION</div>

<div style="font-size:11px">AGENT COUNT</div>
<input id="agentSlider" type="range" min="50" max="300" value="150" style="width:100%">

<div style="font-size:11px;margin-top:12px">SIM SPEED</div>
<input id="speedSlider" type="range" min="1" max="5" step="1" value="1" style="width:100%">

<button id="resetBtn" style="
margin-top:14px;
width:100%;
padding:6px;
background:#00ffcc;
border:none;
cursor:pointer">
RESET
</button>

<button id="exitToggle" style="
margin-top:10px;
width:100%;
padding:6px;
background:#ff8800;
border:none;
cursor:pointer">
BLOCK EXIT
</button>
`;

document.body.appendChild(panel);

/* ── AGENTS ────────────────────────────────────── */

const agents = [];
let totalAgents = 150;

function randomPosition() {

const rooms = [
[-25,10],
[10,10],
[-25,0],
[10,0],
[-25,-10],
[10,-10]
];

const r = rooms[Math.floor(Math.random()*rooms.length)];

return new THREE.Vector2(
r[0] + Math.random()*10,
r[1] + Math.random()*6
);

}

function spawnAgents(count){

agents.forEach(a=>{
scene.remove(a.mesh);
a.trailMeshes.forEach(m=>scene.remove(m));
});

agents.length = 0;

for(let i=0;i<count;i++){

const agent = new Agent(randomPosition(),doors,exit);

agent.addToScene(scene);

agents.push(agent);

}

totalAgents = count;

document.getElementById("agentCount").textContent = count;

}

spawnAgents(150);

/* ── PANEL EVENTS ─────────────────────────────── */

document.getElementById("agentSlider").addEventListener("input",(e)=>{

spawnAgents(parseInt(e.target.value));

});

document.getElementById("speedSlider").addEventListener("input",(e)=>{

simulationSpeed = parseInt(e.target.value);

});

document.getElementById("resetBtn").onclick = ()=>{

location.reload();

};

document.getElementById("exitToggle").onclick = () => {

window.exitBlocked = !window.exitBlocked;

if (window.exitBlocked) {

exitMesh.material.color.set(0xff0000);

// create blocking wall
const a = new THREE.Vector2(-4, -20);
const b = new THREE.Vector2(4, -20);

exitWall = {
a,
b,
closestPoint(p){

const ab = b.clone().sub(a);

const t = (p.clone().sub(a)).dot(ab) / ab.lengthSq();

const clamped = Math.max(0, Math.min(1, t));

return a.clone().add(ab.multiplyScalar(clamped));

}
};

walls.push(exitWall);

} else {

exitMesh.material.color.set(0x00ff88);

// remove blocking wall
if(exitWall){
const index = walls.indexOf(exitWall);
if(index !== -1) walls.splice(index,1);
exitWall = null;
}

}

};

/* ── TRIGGER EMERGENCY ─────────────────────────── */

export function triggerEmergency(){

if(emergency) return;

emergency = true;

flashOpacity = 0.4;

document.getElementById("status").textContent = "STATUS: EMERGENCY";

}

renderer.domElement.addEventListener("click", () => triggerEmergency());

/* ── ANIMATE ───────────────────────────────────── */

function animate(){

requestAnimationFrame(animate);

time++;

for(let s=0;s<simulationSpeed;s++){

agents.forEach(a=>a.update(agents,walls,flowField,emergency));

}

const alive = agents.filter(a=>!a.evacuated).length;

document.getElementById("agentCount").textContent = alive;

document.getElementById("evacCount").textContent = totalAgents - alive;

if(flashOpacity>0){

flashOpacity -= 0.01;

flashMat.opacity = flashOpacity;

}

renderer.render(scene,camera);

}

animate();