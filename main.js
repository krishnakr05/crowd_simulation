import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

import Agent from "./agent.js";
import { createBuilding } from "./building.js";
import FlowField from "./FlowField.js";

const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.OrthographicCamera(-50, 50, 30, -30, 1, 100);
camera.position.z = 50;

// Renderer setup
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create building and get walls, doors, exit
const { walls, doors, exit } = createBuilding(scene);

// Create FlowField for navigation through doors → exit
const flowField = new FlowField(exit, doors);

// Agents array
const agents = [];

// Random initial positions inside rooms
function randomPosition() {
  const rooms = [
    [-25, 10],
    [10, 10],
    [-25, 0],
    [10, 0],
    [-25, -10],
    [10, -10],
  ];
  const r = rooms[Math.floor(Math.random() * rooms.length)];
  return new THREE.Vector2(r[0] + Math.random() * 10, r[1] + Math.random() * 6);
}

// Spawn agents
for (let i = 0; i < 150; i++) {
  let agent = new Agent(randomPosition(), doors, exit);
  agents.push(agent);
  scene.add(agent.mesh);
}

// Emergency trigger
let emergency = false;
window.addEventListener("click", () => {
  emergency = true;
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  agents.forEach((a) => {
    // Pass FlowField instead of exit for proper door navigation
    a.update(agents, walls, flowField, emergency);
  });

  renderer.render(scene, camera);
}

animate();