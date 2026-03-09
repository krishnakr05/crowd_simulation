import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Wall from "./wall.js";

const ROOM_COLOR      = 0x0d1b2a;
const CORRIDOR_COLOR  = 0x0a1520;
const FLOOR_COLOR     = 0x060e18;
const COURTYARD_COLOR = 0x071510;

/* ── SHARED HELPERS ──────────────────────────────────────────────── */
function v(x, y) { return new THREE.Vector2(x, y); }

function makeWall(scene, walls, a, b) {
  const w = new Wall(a, b);
  walls.push(w);
  scene.add(w.mesh);
}

function makeFloor(scene, cx, cy, w, h, color = ROOM_COLOR, z = -0.2) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.position.set(cx, cy, z);
  scene.add(mesh);
  return mesh;
}

function makeGrid(scene, xMin, xMax, yMin, yMax, step = 5) {
  const mat = new THREE.LineBasicMaterial({ color: 0x112233, transparent: true, opacity: 0.4 });
  for (let x = xMin; x <= xMax; x += step) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, yMin, -0.1), new THREE.Vector3(x, yMax, -0.1),
    ]);
    scene.add(new THREE.Line(g, mat));
  }
  for (let y = yMin; y <= yMax; y += step) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xMin, y, -0.1), new THREE.Vector3(xMax, y, -0.1),
    ]);
    scene.add(new THREE.Line(g, mat));
  }
}

function makeDoorMarker(scene, x, y, vertical = true) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(vertical ? 0.3 : 4, vertical ? 4 : 0.3),
    new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.4 })
  );
  mesh.position.set(x, y, -0.05);
  scene.add(mesh);
}

function makeExit(scene, x, y, rotated = false) {
  const exitPos = v(x, y);
  const bar = new THREE.Mesh(
    new THREE.PlaneGeometry(rotated ? 1.5 : 8, rotated ? 8 : 1.5),
    new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 })
  );
  bar.position.set(x, y, 0.1);
  scene.add(bar);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(rotated ? 3 : 12, rotated ? 12 : 3),
    new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.15 })
  );
  glow.position.set(x, y, 0.05);
  scene.add(glow);
  return { pos: exitPos, bar, glow };
}

/* ════════════════════════════════════════════════════════════════════
   LAYOUT 1 — SYMMETRIC
   ════════════════════════════════════════════════════════════════════ */
export function createSymmetricLayout(scene) {
  const walls = [];
  const doors = [];
  const meshes = [];
  function add(a, b) { makeWall(scene, walls, a, b); }

  meshes.push(makeFloor(scene, 0, 0, 60, 40, FLOOR_COLOR, -0.3));
  meshes.push(makeFloor(scene, -17.5,  13.5, 25, 13));
  meshes.push(makeFloor(scene, -17.5,   0,   25, 14));
  meshes.push(makeFloor(scene, -17.5, -13.5, 25, 13));
  meshes.push(makeFloor(scene,  17.5,  13.5, 25, 13));
  meshes.push(makeFloor(scene,  17.5,   0,   25, 14));
  meshes.push(makeFloor(scene,  17.5, -13.5, 25, 13));
  meshes.push(makeFloor(scene,  0, 0, 10, 40, CORRIDOR_COLOR));
  makeGrid(scene, -30, 30, -20, 20);

  add(v(-30, -20), v( -4, -20));
  add(v(  4, -20), v( 30, -20));
  add(v(-30,  20), v( -4,  20));
  add(v(  4,  20), v( 30,  20));
  add(v(-30, -20), v(-30,  20));
  add(v( 30, -20), v( 30,  20));

  add(v(-5,  20), v(-5, 12));
  add(v(-5,   8), v(-5,  2));
  add(v(-5,  -2), v(-5,-12));
  add(v(-5, -16), v(-5,-20));

  add(v(5,  20), v(5, 12));
  add(v(5,   8), v(5,  2));
  add(v(5,  -2), v(5,-12));
  add(v(5, -16), v(5,-20));

  add(v(-30,  7), v(-5,  7));
  add(v(-30, -7), v(-5, -7));
  add(v(  5,  7), v(30,  7));
  add(v(  5, -7), v(30, -7));

  doors.push(v(-5,  10));
  doors.push(v(-5,   0));
  doors.push(v(-5, -14));
  doors.push(v( 5,  10));
  doors.push(v( 5,   0));
  doors.push(v( 5, -14));
  doors.forEach((d) => makeDoorMarker(scene, d.x, d.y, true));

  const exitBottom = makeExit(scene, 0, -20);
  const exitTop    = makeExit(scene, 0,  20);

  const rooms = [
    { xMin: -30, xMax: -5, yMin:  7, yMax: 20, doorIndices: [0] },
    { xMin: -30, xMax: -5, yMin: -7, yMax:  7, doorIndices: [1] },
    { xMin: -30, xMax: -5, yMin:-20, yMax: -7, doorIndices: [2] },
    { xMin:   5, xMax: 30, yMin:  7, yMax: 20, doorIndices: [3] },
    { xMin:   5, xMax: 30, yMin: -7, yMax:  7, doorIndices: [4] },
    { xMin:   5, xMax: 30, yMin:-20, yMax: -7, doorIndices: [5] },
    { xMin:  -5, xMax:   5, yMin:-20, yMax: 20, doorIndices: [], inCorridor: true },
  ];

  const spawnZones = [
    { cx: -20, cy:  13, w: 18, h: 10 },
    { cx: -20, cy:   0, w: 18, h: 12 },
    { cx: -20, cy: -13, w: 18, h: 10 },
    { cx:  20, cy:  13, w: 18, h: 10 },
    { cx:  20, cy:   0, w: 18, h: 12 },
    { cx:  20, cy: -13, w: 18, h: 10 },
  ];

  return { walls, doors, meshes, exits: [exitBottom, exitTop], rooms, spawnZones, corridorCenter: new THREE.Vector2(0, 0), name: 'symmetric' };
}

/* ════════════════════════════════════════════════════════════════════
   LAYOUT 2 — COURTYARD SCHOOL
   ════════════════════════════════════════════════════════════════════

   Floor mesh edges (cx, cy, w, h → xMin, xMax, yMin, yMax):

   CL1:  makeFloor(-24, 18, 20, 8)  → x:-34→-14,  y:14→22
   CL2:  makeFloor(  0, 18, 20, 8)  → x:-10→ 10,  y:14→22
   CL3:  makeFloor( 24, 18, 20, 8)  → x: 14→ 34,  y:14→22
   CL4:  makeFloor(-24,-18, 20, 8)  → x:-34→-14,  y:-22→-14
   CL5:  makeFloor(  0,-18, 20, 8)  → x:-10→ 10,  y:-22→-14
   CL6:  makeFloor( 24,-18, 20, 8)  → x: 14→ 34,  y:-22→-14
   CL7:  makeFloor(-30,  6, 16,10)  → x:-38→-22,  y:  1→ 11
   CL8:  makeFloor(-30, -6, 16,10)  → x:-38→-22,  y:-11→ -1
   CL9:  makeFloor( 30,  6, 16,10)  → x: 22→ 38,  y:  1→ 11
   CL10: makeFloor( 30, -6, 16,10)  → x: 22→ 38,  y:-11→ -1

   Outer building: x:-38→38, y:-22→22
   Courtyard:      x:-18→18, y:-10→10

   Exit gaps (8 units, in corners of outer wall):
     NW: top wall,    x:-38→-30  → exits at top-left corner
     NE: top wall,    x: 30→ 38
     SW: bottom wall, x:-38→-30
     SE: bottom wall, x: 30→ 38

   Key rule: NO classroom wall enters the corner zones
     (x:-38→-34, y:14→22) and (x:34→38, y:14→22) etc.
   CL1 right edge is x=-14, left edge is x=-34. Its LEFT outer wall
   stops at x=-34, which is INSIDE the building — the outer wall
   covers x=-38→-34 and x=-34 is where CL1's left edge sits.
   So CL1 left wall = x=-34 (matches floor left edge exactly).
   The corner zone x:-38→-34 is pure corridor — no classroom wall.

   ════════════════════════════════════════════════════════════════════ */
export function createCourtyardLayout(scene) {
  const walls = [];
  const doors = [];
  const meshes = [];
  function add(a, b) { makeWall(scene, walls, a, b); }

  meshes.push(makeFloor(scene, 0, 0, 80, 50, FLOOR_COLOR, -0.3));
  meshes.push(makeFloor(scene, 0, 0, 36, 20, COURTYARD_COLOR, -0.15));

  // Corridor ring
  meshes.push(makeFloor(scene,  0,  18, 76, 8,  CORRIDOR_COLOR));
  meshes.push(makeFloor(scene,  0, -18, 76, 8,  CORRIDOR_COLOR));
  meshes.push(makeFloor(scene, -30,  0, 16, 20, CORRIDOR_COLOR));
  meshes.push(makeFloor(scene,  30,  0, 16, 20, CORRIDOR_COLOR));

  // Classroom floors (unchanged — these are correct)
  // CL1/CL3/CL4/CL6: outer edge stops at x=±30 (exit zones are x:±38→±30)
  // CL2/CL5: widened to x:-14→14 to fill gaps between corner and center classrooms
  // CL7/CL8/CL9/CL10: stretched to meet at y=0 with no gap
  meshes.push(makeFloor(scene, -22,  18, 16, 8));  // CL1: x:-30→-14, y:14→22
  meshes.push(makeFloor(scene,   0,  18, 28, 8));  // CL2: x:-14→ 14, y:14→22
  meshes.push(makeFloor(scene,  22,  18, 16, 8));  // CL3: x: 14→ 30, y:14→22
  meshes.push(makeFloor(scene, -22, -18, 16, 8));  // CL4: x:-30→-14, y:-22→-14
  meshes.push(makeFloor(scene,   0, -18, 28, 8));  // CL5: x:-14→ 14, y:-22→-14
  meshes.push(makeFloor(scene,  22, -18, 16, 8));  // CL6: x: 14→ 30, y:-22→-14
  meshes.push(makeFloor(scene, -30, 5.5, 16, 11)); // CL7: x:-38→-22, y: 0→11
  meshes.push(makeFloor(scene, -30,-5.5, 16, 11)); // CL8: x:-38→-22, y:-11→ 0
  meshes.push(makeFloor(scene,  30, 5.5, 16, 11)); // CL9: x: 22→ 38, y: 0→11
  meshes.push(makeFloor(scene,  30,-5.5, 16, 11)); // CL10:x: 22→ 38, y:-11→ 0

  makeGrid(scene, -38, 38, -22, 22, 4);

  /* ── OUTER WALLS ─────────────────────────────────────────────────
     Building perimeter: x:-38→38, y:-22→22
     Exit gaps (8 units) at each corner of top and bottom walls:
       NW gap: x:-38→-30  (top wall)
       NE gap: x: 30→ 38  (top wall)
       SW gap: x:-38→-30  (bottom wall)
       SE gap: x: 30→ 38  (bottom wall)
     Left and right outer walls are solid (no exits there).
  ─────────────────────────────────────────────────────────────────── */
  // Top wall: draw only the center portion, leaving corner gaps
  add(v(-30,  22), v( 30,  22));
  // Bottom wall: same
  add(v(-30, -22), v( 30, -22));
  // Left wall: full height, solid
  add(v(-38,  22), v(-38, -22));
  // Right wall: full height, solid
  add(v( 38,  22), v( 38, -22));

  /* ── COURTYARD WALLS ─────────────────────────────────────────────── */
  add(v(-18,  10), v( 18,  10));
  add(v(-18, -10), v( 18, -10));
  add(v(-18,  10), v(-18, -10));
  add(v( 18,  10), v( 18, -10));

  /* ── CLASSROOM WALLS ─────────────────────────────────────────────
     Every wall segment is derived from the floor mesh edges above.
     Each classroom has 4 walls: top, bottom, left, right.
     The wall facing the corridor gets a door gap (4 units wide).
     Walls that coincide with the outer building wall are OMITTED
     (the outer wall already covers them).
     Walls that would enter the corner exit zone are STOPPED
     at the corner boundary.

     Corner zones (no walls allowed inside):
       NW: x:-38→-30, y:14→22
       NE: x: 30→ 38, y:14→22
       SW: x:-38→-30, y:-22→-14
       SE: x: 30→ 38, y:-22→-14
  ─────────────────────────────────────────────────────────────────── */

  /* CL1: x:-30→-14, y:14→22
     - Bottom (y=14): door gap centered x=-22, gap x:-25→-19 (6 units wide)
  */
  add(v(-30,  22), v(-30,  14)); // CL1 left wall
  add(v(-14,  22), v(-14,  14)); // CL1 right wall
  add(v(-30,  14), v(-25,  14)); // CL1 bottom — left of door
  add(v(-19,  14), v(-14,  14)); // CL1 bottom — right of door

  /* CL2: x:-14→14, y:14→22
     - Bottom (y=14): door gap centered x=0, gap x:-4→4 (8 units wide)
  */
  add(v(-14,  14), v( -4,  14)); // CL2 bottom — left of door
  add(v(  4,  14), v( 14,  14)); // CL2 bottom — right of door

  /* CL3: x:14→30, y:14→22
     - Bottom (y=14): door gap centered x=22, gap x:19→25 (6 units wide)
  */
  add(v( 14,  22), v( 14,  14)); // CL3 left wall
  add(v( 30,  22), v( 30,  14)); // CL3 right wall
  add(v( 14,  14), v( 19,  14)); // CL3 bottom — left of door
  add(v( 25,  14), v( 30,  14)); // CL3 bottom — right of door

  /* CL4: x:-30→-14, y:-22→-14
     - Top (y=-14): door gap centered x=-22, gap x:-25→-19 (6 units wide)
  */
  add(v(-30, -22), v(-30, -14)); // CL4 left wall
  add(v(-14, -22), v(-14, -14)); // CL4 right wall
  add(v(-30, -14), v(-25, -14)); // CL4 top — left of door
  add(v(-19, -14), v(-14, -14)); // CL4 top — right of door

  /* CL5: x:-14→14, y:-22→-14
     - Top (y=-14): door gap centered x=0, gap x:-4→4 (8 units wide)
  */
  add(v(-14, -14), v( -4, -14)); // CL5 top — left of door
  add(v(  4, -14), v( 14, -14)); // CL5 top — right of door

  /* CL6: x:14→30, y:-22→-14
     - Top (y=-14): door gap centered x=22, gap x:19→25 (6 units wide)
  */
  add(v( 14, -22), v( 14, -14)); // CL6 left wall
  add(v( 30, -22), v( 30, -14)); // CL6 right wall
  add(v( 14, -14), v( 19, -14)); // CL6 top — left of door
  add(v( 25, -14), v( 30, -14)); // CL6 top — right of door

  /* CL7: x:-38→-22, y:0→11
     - Right (x=-22): door gap centered y=5.5, gap y:2.5→8.5 (6 units wide)
  */
  add(v(-38,  11), v(-22,  11)); // CL7 top wall
  add(v(-22,  11), v(-22, 8.5)); // CL7 right — above door
  add(v(-22, 2.5), v(-22,   0)); // CL7 right — below door

  /* CL8: x:-38→-22, y:-11→0
     - Right (x=-22): door gap centered y=-5.5, gap y:-8.5→-2.5 (6 units wide)
  */
  add(v(-38, -11), v(-22, -11)); // CL8 bottom wall
  add(v(-22,   0), v(-22,-2.5)); // CL8 right — above door
  add(v(-22,-8.5), v(-22, -11)); // CL8 right — below door

  /* CL9: x:22→38, y:0→11
     - Left (x=22): door gap centered y=5.5, gap y:2.5→8.5 (6 units wide)
  */
  add(v( 22,  11), v( 38,  11)); // CL9 top wall
  add(v( 22,  11), v( 22, 8.5)); // CL9 left — above door
  add(v( 22, 2.5), v( 22,   0)); // CL9 left — below door

  /* CL10: x:22→38, y:-11→0
     - Left (x=22): door gap centered y=-5.5, gap y:-8.5→-2.5 (6 units wide)
  */
  add(v( 22, -11), v( 38, -11)); // CL10 bottom wall
  add(v( 22,   0), v( 22,-2.5)); // CL10 left — above door
  add(v( 22,-8.5), v( 22, -11)); // CL10 left — below door

  /* ── DOORS ───────────────────────────────────────────────────────── */
  doors.push(v(-22,  14)); // 0 CL1 — center of gap x:-25→-19
  doors.push(v(  0,  14)); // 1 CL2 — center of gap x:-4→4
  doors.push(v( 22,  14)); // 2 CL3 — center of gap x:19→25
  doors.push(v(-22, -14)); // 3 CL4
  doors.push(v(  0, -14)); // 4 CL5
  doors.push(v( 22, -14)); // 5 CL6
  doors.push(v(-22, 5.5)); // 6 CL7 — center of gap y:2.5→8.5
  doors.push(v(-22,-5.5)); // 7 CL8 — center of gap y:-8.5→-2.5
  doors.push(v( 22, 5.5)); // 8 CL9
  doors.push(v( 22,-5.5)); // 9 CL10
  doors.forEach((d, i) => makeDoorMarker(scene, d.x, d.y, i >= 6));

  /* ── EXITS ───────────────────────────────────────────────────────── */
  // NW: top wall gap x:-38→-30, exit marker at x=-34, y=22
  // NE: top wall gap x:30→38,   exit marker at x=34,  y=22
  // SW: bottom wall gap x:-38→-30, exit marker at x=-34, y=-22
  // SE: bottom wall gap x:30→38,   exit marker at x=34,  y=-22
  const exitNW = makeExit(scene, -34,  22, false);
  const exitNE = makeExit(scene,  34,  22, false);
  const exitSW = makeExit(scene, -34, -22, false);
  const exitSE = makeExit(scene,  34, -22, false);

  const rooms = [
    { xMin: -30, xMax: -14, yMin:  14, yMax:  22, doorIndices: [0] }, // CL1
    { xMin: -14, xMax:  14, yMin:  14, yMax:  22, doorIndices: [1] }, // CL2
    { xMin:  14, xMax:  30, yMin:  14, yMax:  22, doorIndices: [2] }, // CL3
    { xMin: -30, xMax: -14, yMin: -22, yMax: -14, doorIndices: [3] }, // CL4
    { xMin: -14, xMax:  14, yMin: -22, yMax: -14, doorIndices: [4] }, // CL5
    { xMin:  14, xMax:  30, yMin: -22, yMax: -14, doorIndices: [5] }, // CL6
    { xMin: -38, xMax: -22, yMin:   0, yMax:  11, doorIndices: [6] }, // CL7
    { xMin: -38, xMax: -22, yMin: -11, yMax:   0, doorIndices: [7] }, // CL8
    { xMin:  22, xMax:  38, yMin:   0, yMax:  11, doorIndices: [8] }, // CL9
    { xMin:  22, xMax:  38, yMin: -11, yMax:   0, doorIndices: [9] }, // CL10
    { xMin: -18, xMax:  18, yMin: -10, yMax:  10, doorIndices: [], isBlocked: true }, // courtyard
    { xMin: -38, xMax:  38, yMin: -22, yMax:  22, doorIndices: [], inCorridor: true },
  ];

  const spawnZones = [
    { cx: -22, cy:  18, w: 14, h: 6 }, // CL1
    { cx:   0, cy:  18, w: 26, h: 6 }, // CL2
    { cx:  22, cy:  18, w: 14, h: 6 }, // CL3
    { cx: -22, cy: -18, w: 14, h: 6 }, // CL4
    { cx:   0, cy: -18, w: 26, h: 6 }, // CL5
    { cx:  22, cy: -18, w: 14, h: 6 }, // CL6
    { cx: -30, cy: 5.5, w: 12, h: 9 }, // CL7
    { cx: -30, cy:-5.5, w: 12, h: 9 }, // CL8
    { cx:  30, cy: 5.5, w: 12, h: 9 }, // CL9
    { cx:  30, cy:-5.5, w: 12, h: 9 }, // CL10
  ];

  // Waypoints: in corridor, aligned with door center x/y.
  // y=±12 is safely between classroom walls (y=±14) and CL7-10 bounds (y=±11).
  // x=±19 is safely between courtyard wall (x=±18) and classroom wall (x=±22).
  const waypoints = [
    new THREE.Vector2(-22,  12), // 0 CL1  — door at (-22,14)
    new THREE.Vector2(  0,  12), // 1 CL2
    new THREE.Vector2( 22,  12), // 2 CL3
    new THREE.Vector2(-22, -12), // 3 CL4  — door at (-22,-14)
    new THREE.Vector2(  0, -12), // 4 CL5
    new THREE.Vector2( 22, -12), // 5 CL6
    new THREE.Vector2(-19,  5.5),// 6 CL7  — door at (-22,5.5)
    new THREE.Vector2(-19, -5.5),// 7 CL8
    new THREE.Vector2( 19,  5.5),// 8 CL9
    new THREE.Vector2( 19, -5.5),// 9 CL10
  ];

  // Junction points where side corridors meet top/bottom corridors.
  // Agents in the side strips must pass through these before heading to an exit.
  const junctions = [
    new THREE.Vector2(-22,  12), // NW junction — top of left corridor
    new THREE.Vector2(-22, -12), // SW junction — bottom of left corridor
    new THREE.Vector2( 22,  12), // NE junction — top of right corridor
    new THREE.Vector2( 22, -12), // SE junction — bottom of right corridor
  ];

  return {
    walls, doors, meshes,
    exits: [exitNW, exitNE, exitSW, exitSE],
    rooms, spawnZones, waypoints, junctions,
    corridorCenter: new THREE.Vector2(0, 0),
    name: 'courtyard'
  };
}

/* ════════════════════════════════════════════════════════════════════
   LAYOUT 3 — OFFICE FLOOR
   ════════════════════════════════════════════════════════════════════

   Floor mesh edges:
   OffA: makeFloor(-24, 16, 22,10) → x:-35→-13, y:11→21
   OffB: makeFloor( 20, 16, 28,10) → x:  6→ 34, y:11→21
   Meet: makeFloor( -2,  2, 26,10) → x:-15→ 11, y:-3→ 7
   OffC: makeFloor(-24,-14, 22,10) → x:-35→-13, y:-19→-9
   WC:   makeFloor(  4,-14, 10,10) → x: -1→  9, y:-19→-9
   OffD: makeFloor( 24,-14, 20,10) → x: 14→ 34, y:-19→-9

   Outer building: x:-38→38, y:-22→22
   Exit gaps (6 units) in bottom wall:
     Exit A: x:-14→-8  (gap)
     Exit B: x: 16→ 22 (gap)

   Rules:
   - Walls coinciding with outer wall are OMITTED
   - All rooms are floating islands except where noted
   - Each room has exactly one door gap (4 units wide)
   - Door gap is on the wall facing the open floor (away from outer wall)
   ════════════════════════════════════════════════════════════════════ */
export function createOfficeLayout(scene) {
  const walls = [];
  const doors = [];
  const meshes = [];
  function add(a, b) { makeWall(scene, walls, a, b); }

  meshes.push(makeFloor(scene, 0, 0, 80, 50, FLOOR_COLOR, -0.3));
  meshes.push(makeFloor(scene, 0, 0, 76, 46, CORRIDOR_COLOR));

  meshes.push(makeFloor(scene, -24,  16, 22, 10)); // OffA: x:-35→-13, y:11→21
  meshes.push(makeFloor(scene,  20,  16, 28, 10)); // OffB: x:  6→ 34, y:11→21
  meshes.push(makeFloor(scene,  -2,   2, 26, 10)); // Meet: x:-15→ 11, y:-3→ 7
  meshes.push(makeFloor(scene, -24, -14, 22, 10)); // OffC: x:-35→-13, y:-19→-9
  meshes.push(makeFloor(scene,   4, -14, 10, 10)); // WC:   x: -1→  9, y:-19→-9
  meshes.push(makeFloor(scene,  24, -14, 20, 10)); // OffD: x: 14→ 34, y:-19→-9

  makeGrid(scene, -38, 38, -22, 22, 4);

  /* OUTER WALLS */
  add(v(-38,  22), v( 38,  22)); // top (full)
  add(v(-38, -22), v(-14, -22)); // bottom — left of Exit A
  add(v( -8, -22), v( 16, -22)); // bottom — between exits
  add(v( 22, -22), v( 38, -22)); // bottom — right of Exit B
  add(v(-38,  22), v(-38, -22)); // left (full)
  add(v( 38,  22), v( 38, -22)); // right (full)

  /* OFFICE A: x:-35→-13, y:11→21
     Flush against: top outer wall (y=22 — not touching, room top is y=21)
                    left outer wall (x=-38 — not touching, room left is x=-35)
     So all 4 walls needed.
     Door: bottom wall (y=11), gap centered x=-24, gap x:-26→-22.
  */
  add(v(-35,  21), v(-13,  21)); // top
  add(v(-35,  21), v(-35,  11)); // left
  add(v(-13,  21), v(-13,  11)); // right
  add(v(-35,  11), v(-26,  11)); // bottom — left of door
  add(v(-22,  11), v(-13,  11)); // bottom — right of door

  /* OFFICE B: x:6→34, y:11→21
     Door: bottom wall (y=11), gap centered x=20, gap x:18→22.
  */
  add(v(  6,  21), v( 34,  21)); // top
  add(v(  6,  21), v(  6,  11)); // left
  add(v( 34,  21), v( 34,  11)); // right
  add(v(  6,  11), v( 18,  11)); // bottom — left of door
  add(v( 22,  11), v( 34,  11)); // bottom — right of door

  /* MEETING ROOM: x:-15→11, y:-3→7
     Floating island — all 4 walls needed.
     Door: bottom wall (y=-3), gap centered x=-2, gap x:-4→0.
  */
  add(v(-15,   7), v( 11,   7)); // top
  add(v(-15,   7), v(-15,  -3)); // left
  add(v( 11,   7), v( 11,  -3)); // right
  add(v(-15,  -3), v( -4,  -3)); // bottom — left of door
  add(v(  0,  -3), v( 11,  -3)); // bottom — right of door

  /* OFFICE C: x:-35→-13, y:-19→-9
     Door: top wall (y=-9), gap centered x=-24, gap x:-26→-22.
  */
  add(v(-35,  -9), v(-26,  -9)); // top — left of door
  add(v(-22,  -9), v(-13,  -9)); // top — right of door
  add(v(-35,  -9), v(-35, -19)); // left
  add(v(-13,  -9), v(-13, -19)); // right
  add(v(-35, -19), v(-13, -19)); // bottom

  /* WC: x:-1→9, y:-19→-9
     Door: top wall (y=-9), gap centered x=4, gap x:2→6.
  */
  add(v( -1,  -9), v(  2,  -9)); // top — left of door
  add(v(  6,  -9), v(  9,  -9)); // top — right of door
  add(v( -1,  -9), v( -1, -19)); // left
  add(v(  9,  -9), v(  9, -19)); // right
  add(v( -1, -19), v(  9, -19)); // bottom

  /* OFFICE D: x:14→34, y:-19→-9
     Door: top wall (y=-9), gap centered x=24, gap x:22→26.
  */
  add(v( 14,  -9), v( 22,  -9)); // top — left of door
  add(v( 26,  -9), v( 34,  -9)); // top — right of door
  add(v( 14,  -9), v( 14, -19)); // left
  add(v( 34,  -9), v( 34, -19)); // right
  add(v( 14, -19), v( 34, -19)); // bottom

  /* DOORS */
  doors.push(v(-24,  11)); // 0 Office A — bottom wall
  doors.push(v( 20,  11)); // 1 Office B — bottom wall
  doors.push(v( -2,  -3)); // 2 Meeting room — bottom wall
  doors.push(v(-24,  -9)); // 3 Office C — top wall
  doors.push(v(  4,  -9)); // 4 WC — top wall
  doors.push(v( 24,  -9)); // 5 Office D — top wall
  doors.forEach((d) => makeDoorMarker(scene, d.x, d.y, false));

  /* EXITS */
  const exitA = makeExit(scene, -11, -22, false); // center of gap x:-14→-8
  const exitB = makeExit(scene,  19, -22, false); // center of gap x:16→22

  const rooms = [
    { xMin: -35, xMax: -13, yMin:  11, yMax:  21, doorIndices: [0] }, // Office A
    { xMin:   6, xMax:  34, yMin:  11, yMax:  21, doorIndices: [1] }, // Office B
    { xMin: -15, xMax:  11, yMin:  -3, yMax:   7, doorIndices: [2] }, // Meeting
    { xMin: -35, xMax: -13, yMin: -19, yMax:  -9, doorIndices: [3] }, // Office C
    { xMin:  -1, xMax:   9, yMin: -19, yMax:  -9, doorIndices: [4] }, // WC
    { xMin:  14, xMax:  34, yMin: -19, yMax:  -9, doorIndices: [5] }, // Office D
    { xMin: -38, xMax:  38, yMin: -22, yMax:  22, doorIndices: [], inCorridor: true },
  ];

  const spawnZones = [
    { cx: -24, cy:  16, w: 18, h:  8 }, // Office A
    { cx:  20, cy:  16, w: 24, h:  8 }, // Office B
    { cx:  -2, cy:   2, w: 22, h:  8 }, // Meeting
    { cx: -24, cy: -14, w: 18, h:  8 }, // Office C
    { cx:   4, cy: -14, w:  6, h:  8 }, // WC
    { cx:  24, cy: -14, w: 16, h:  8 }, // Office D
  ];

  return { walls, doors, meshes, exits: [exitA, exitB], rooms, spawnZones, corridorCenter: new THREE.Vector2(0, 0), name: 'office' };
}