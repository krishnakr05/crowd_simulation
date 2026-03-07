import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Wall from "./wall.js";

// Room floor color — subtle, dark tones so agents are always readable
const ROOM_COLOR    = 0x0d1b2a;  
const CORRIDOR_COLOR = 0x0a1520; 
const FLOOR_COLOR   = 0x060e18;  

export function createBuilding(scene) {
  const walls = [];
  const doors = [];

  function v(x, y) { return new THREE.Vector2(x, y); }

  function add(a, b) {
    const w = new Wall(a, b);
    walls.push(w);
    scene.add(w.mesh);
  }

  /* ── BACKGROUND FLOOR ─────────────────────────────────────────── */
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 40),
    new THREE.MeshBasicMaterial({ color: FLOOR_COLOR })
  );
  floorMesh.position.set(0, 0, -0.3);
  scene.add(floorMesh);

  /* ── ROOM FLOORS ─────────────────────────────────────────────── */
  // Each room gets a slightly lighter fill so the layout is readable
  function addRoom(cx, cy, w, h, color = ROOM_COLOR) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.position.set(cx, cy, -0.2);
    scene.add(mesh);
  }

  // Left rooms (x: -30 to -5)
  addRoom(-17.5, 13.5, 25, 13);  // top-left
  addRoom(-17.5,  0,   25, 14);  // mid-left
  addRoom(-17.5,-13.5, 25, 13);  // bot-left

  // Right rooms (x: 5 to 30)
  addRoom(17.5, 13.5, 25, 13);   // top-right
  addRoom(17.5,  0,   25, 14);   // mid-right
  addRoom(17.5,-13.5, 25, 13);   // bot-right

  // Corridor
  addRoom(0, 0, 10, 40, CORRIDOR_COLOR);

  /* ── SUBTLE GRID ─────────────────────────────────────────────── */
  // Thin grid lines give a technical/data-vis feel
  const gridMat = new THREE.LineBasicMaterial({ color: 0x112233, transparent: true, opacity: 0.5 });
  for (let x = -30; x <= 30; x += 5) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -20, -0.1),
      new THREE.Vector3(x,  20, -0.1),
    ]);
    scene.add(new THREE.Line(g, gridMat));
  }
  for (let y = -20; y <= 20; y += 5) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-30, y, -0.1),
      new THREE.Vector3( 30, y, -0.1),
    ]);
    scene.add(new THREE.Line(g, gridMat));
  }

  /* ── OUTER BUILDING WALLS ────────────────────────────────────── */
  add(v(-30, -20), v(-4, -20));
  add(v(4,   -20), v(30, -20));
  add(v(-30,  20), v(30,  20));
  add(v(-30, -20), v(-30, 20));
  add(v( 30, -20), v( 30, 20));

  /* ── LEFT CORRIDOR WALL ──────────────────────────────────────── */
  add(v(-5,  20), v(-5, 12));
  add(v(-5,   8), v(-5,  2));
  add(v(-5,  -2), v(-5,-12));
  add(v(-5, -16), v(-5,-20));

  /* ── RIGHT CORRIDOR WALL ─────────────────────────────────────── */
  add(v(5,  20), v(5, 12));
  add(v(5,   8), v(5,  2));
  add(v(5,  -2), v(5,-12));
  add(v(5, -16), v(5,-20));

  /* ── ROOM SEPARATORS ─────────────────────────────────────────── */
  add(v(-30,  7), v(-5,  7));
  add(v(-30, -7), v(-5, -7));
  add(v(  5,  7), v(30,  7));
  add(v(  5, -7), v(30, -7));

  /* ── DOOR POSITIONS ──────────────────────────────────────────── */
  doors.push(v(-5,  10));
  doors.push(v(-5,   0));
  doors.push(v(-5, -14));
  doors.push(v( 5,  10));
  doors.push(v( 5,   0));
  doors.push(v( 5, -14));

  /* ── DOOR MARKERS ────────────────────────────────────────────── */
  // Small cyan dashes to visually mark where doors are
  doors.forEach((d) => {
    const isLeft = d.x < 0;
    const doorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 4),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.4 })
    );
    doorMesh.position.set(d.x, d.y, -0.05);
    scene.add(doorMesh);
  });

  /* ── EXIT ────────────────────────────────────────────────────── */
  const exit = v(0, -20);

  // Green glowing exit bar
  const exitMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 1.5),
    new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 })
  );
  exitMesh.position.set(0, -19.5, 0.1);
  scene.add(exitMesh);

  // Outer glow ring around exit
  const exitGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3),
    new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.15 })
  );
  exitGlow.position.set(0, -19.5, 0.05);
  scene.add(exitGlow);

  // "EXIT" label — arrow shape made from a triangle
  const arrowGeo = new THREE.BufferGeometry();
  arrowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0,  1, 0.2,
   -1.5, -0.5, 0.2,
    1.5, -0.5, 0.2,
  ]), 3));
  arrowGeo.setIndex([0, 1, 2]);
  const arrowMesh = new THREE.Mesh(
    arrowGeo,
    new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide })
  );
  arrowMesh.position.set(0, -18.5, 0.1);
  scene.add(arrowMesh);

  return { walls, doors, exit, exitMesh, exitGlow };
}
