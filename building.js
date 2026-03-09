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
  return mesh;
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
  doors.forEach((d) => meshes.push(makeDoorMarker(scene, d.x, d.y, true)));

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
   ════════════════════════════════════════════════════════════════════ */
export function createCourtyardLayout(scene) {
  const walls = [];
  const doors = [];
  const meshes = [];
  function add(a, b) { makeWall(scene, walls, a, b); }

  // Background
  meshes.push(makeFloor(scene, 0, 0, 84, 54, FLOOR_COLOR, -0.3));
  // Corridor ring (open space between classrooms and courtyard)
  meshes.push(makeFloor(scene, 0, 0, 80, 50, CORRIDOR_COLOR));
  // Courtyard solid block
  meshes.push(makeFloor(scene, 0, 0, 32, 24, COURTYARD_COLOR, -0.15));

  // Top classrooms: y:17→25, depth=8
  meshes.push(makeFloor(scene, -15, 21, 14, 8)); // CL1: x:-22→-8,  y:17→25
  meshes.push(makeFloor(scene,   0, 21, 16, 8)); // CL2: x:-8→8,    y:17→25
  meshes.push(makeFloor(scene,  15, 21, 14, 8)); // CL3: x:8→22,    y:17→25
  // Bottom classrooms: y:-25→-17, depth=8
  meshes.push(makeFloor(scene, -15,-21, 14, 8)); // CL4: x:-22→-8,  y:-25→-17
  meshes.push(makeFloor(scene,   0,-21, 16, 8)); // CL5: x:-8→8,    y:-25→-17
  meshes.push(makeFloor(scene,  15,-21, 14, 8)); // CL6: x:8→22,    y:-25→-17
  // Left classrooms: x:-40→-30, width=10
  meshes.push(makeFloor(scene, -35, 0, 10, 20)); // CL7: x:-40→-30, y:-10→10
  meshes.push(makeFloor(scene,  35, 0, 10, 20)); // CL8: x:30→40,   y:-10→10

  makeGrid(scene, -40, 40, -25, 25, 4);

  add(v(-32,  25), v( 32,  25));
  add(v(-32, -25), v( 32, -25));
  add(v(-40,  25), v(-40, -25));
  add(v( 40,  25), v( 40, -25));

  add(v(-16,  12), v( 16,  12));
  add(v(-16, -12), v( 16, -12));
  add(v(-16,  12), v(-16, -12));
  add(v( 16,  12), v( 16, -12));

  // ── CL1: x:-22→-8, y:17→25 ──
  add(v(-22, 25), v(-22, 17));
  add(v( -8, 25), v( -8, 17));
  add(v(-22, 17), v(-17, 17));
  add(v(-11, 17), v( -8, 17));

  // ── CL2: x:-8→8, y:17→25 ──
  add(v(8, 25), v(8, 17));
  add(v(-8, 17), v(-3, 17));
  add(v( 3, 17), v( 8, 17));

  // ── CL3: x:8→22, y:17→25 ──
  add(v(22, 25), v(22, 17));
  add(v( 8, 17), v(11, 17));
  add(v(17, 17), v(22, 17));

  // ── CL4: x:-22→-8, y:-25→-17 (mirror of CL1) ──
  add(v(-22, -25), v(-22, -17));
  add(v( -8, -25), v( -8, -17));
  add(v(-22, -17), v(-17, -17));
  add(v(-11, -17), v( -8, -17));

  // ── CL5: x:-8→8, y:-25→-17 (mirror of CL2) ──
  add(v(8, -25), v(8, -17));
  add(v(-8, -17), v(-3, -17));
  add(v( 3, -17), v( 8, -17));

  // ── CL6: x:8→22, y:-25→-17 (mirror of CL3) ──
  add(v(22, -25), v(22, -17));
  add(v( 8, -17), v(11, -17));
  add(v(17, -17), v(22, -17));

  // ── CL7 (left): x:-40→-30, y:-10→10 ──
  add(v(-40,  10), v(-30,  10));
  add(v(-40, -10), v(-30, -10));
  add(v(-30,  10), v(-30,   3));
  add(v(-30,  -3), v(-30, -10));

  // ── CL8 (right): x:30→40, y:-10→10 ──
  add(v( 30,  10), v( 40,  10));
  add(v( 30, -10), v( 40, -10));
  add(v( 30,  10), v( 30,   3));
  add(v( 30,  -3), v( 30, -10));

  doors.push(v(-14,  17)); // 0 CL1
  doors.push(v(  0,  17)); // 1 CL2
  doors.push(v( 14,  17)); // 2 CL3
  doors.push(v(-14, -17)); // 3 CL4
  doors.push(v(  0, -17)); // 4 CL5
  doors.push(v( 14, -17)); // 5 CL6
  doors.push(v(-30,   0)); // 6 CL7
  doors.push(v( 30,   0)); // 7 CL8
  doors.forEach((d, i) => meshes.push(makeDoorMarker(scene, d.x, d.y, i >= 6)));

  const exitNW = makeExit(scene, -36,  25, false); exitNW.pos = v(-36,  25); exitNW.approachPt = v(-29,  13); exitNW.columnPt = v(-27, 11);
  const exitNE = makeExit(scene,  36,  25, false); exitNE.pos = v( 36,  25); exitNE.approachPt = v( 29,  13); exitNE.columnPt = v( 27, 11);
  const exitSW = makeExit(scene, -36, -25, false); exitSW.pos = v(-36, -25); exitSW.approachPt = v(-29, -13); exitSW.columnPt = v(-27,-11);
  const exitSE = makeExit(scene,  36, -25, false); exitSE.pos = v( 36, -25); exitSE.approachPt = v( 29, -13); exitSE.columnPt = v( 27,-11);

  const rooms = [
    { xMin: -22, xMax:  -8, yMin:  17, yMax:  25, doorIndices: [0], routeChain: [0] },
    { xMin:  -8, xMax:   8, yMin:  17, yMax:  25, doorIndices: [1], routeChain: [1] },
    { xMin:   8, xMax:  22, yMin:  17, yMax:  25, doorIndices: [2], routeChain: [2] },
    { xMin: -22, xMax:  -8, yMin: -25, yMax: -17, doorIndices: [3], routeChain: [3] },
    { xMin:  -8, xMax:   8, yMin: -25, yMax: -17, doorIndices: [4], routeChain: [4] },
    { xMin:   8, xMax:  22, yMin: -25, yMax: -17, doorIndices: [5], routeChain: [5] },
    { xMin: -40, xMax: -29.5, yMin: -10, yMax: 10, doorIndices: [6], routeChain: [6, 8] },
    { xMin:  29.5, xMax:  40, yMin: -10, yMax: 10, doorIndices: [7], routeChain: [7, 10] },
    { xMin: -16, xMax:  16, yMin: -12, yMax:  12, doorIndices: [], isBlocked: true },
    { xMin: -40, xMax:  40, yMin: -25, yMax:  25, doorIndices: [], inCorridor: true },
  ];

  const spawnZones = [
    { cx: -15, cy:  21, w: 10, h: 5 },
    { cx:   0, cy:  21, w: 12, h: 5 },
    { cx:  15, cy:  21, w: 10, h: 5 },
    { cx: -15, cy: -21, w: 10, h: 5 },
    { cx:   0, cy: -21, w: 12, h: 5 },
    { cx:  15, cy: -21, w: 10, h: 5 },
    { cx: -35, cy:   0, w:  7, h: 16 },
    { cx:  35, cy:   0, w:  7, h: 16 },
  ];

  const waypoints = [
    new THREE.Vector2(-14,  13), // 0 CL1
    new THREE.Vector2(  0,  13), // 1 CL2
    new THREE.Vector2( 14,  13), // 2 CL3
    new THREE.Vector2(-14, -13), // 3 CL4
    new THREE.Vector2(  0, -13), // 4 CL5
    new THREE.Vector2( 14, -13), // 5 CL6
    new THREE.Vector2(-25,   0), // 6 CL7 door wp
    new THREE.Vector2( 25,   0), // 7 CL8 door wp
    new THREE.Vector2(-25,  11), // 8 CL7 junction — above room y bounds
    new THREE.Vector2(-25, -11), // 9 CL7 junction — below room y bounds
    new THREE.Vector2( 25,  11), // 10 CL8 junction — above room y bounds
    new THREE.Vector2( 25, -11), // 11 CL8 junction — below
  ];

  return {
    walls, doors, meshes,
    exits: [exitNW, exitNE, exitSW, exitSE],
    rooms, spawnZones, waypoints,
    corridorCenter: new THREE.Vector2(0, 0),
    name: 'courtyard'
  };
}

/* ════════════════════════════════════════════════════════════════════
   LAYOUT 3 — MEDICAL CLINIC (OFFICE)
   ════════════════════════════════════════════════════════════════════

   Exit indices:
     0 = exitA  top wall gap x:-25→-17, pos=(-21, 25)  — LEFT/TOP exit
     1 = exitB  right wall gap y:-23→-15, pos=(40,-19) — RIGHT/BOTTOM exit

   Key open corridor spaces:
     Left arm:    x:-25→-10, y:-25→25   (15 wide, therapy doors open here)
     Top strip:   x:-10→40,  y:20→25    (5 tall, ABOVE conf roof y=20 — always clear)
     Mid gap:     x:-25→25,  y:-10→0    (10 tall, between conf bottom y=0 and bottom-rooms top y=-10)
     Lobby:       x:10→40,   y:-25→1    (right of bottom rooms, below Exam2 bottom y=1)

   Routing philosophy:
     exitA (top-left):
       - Therapy rooms: up the left arm, done.
       - Conference: left through mid-gap into left arm, then up.
       - Bottom rooms: left through mid-gap into left arm, then up.
       - Exam rooms: UP through top strip (y=22, above conf roof), across to exitA.
         This completely avoids conference walls.

     exitB (right/bottom):
       - Therapy rooms: cross mid-gap RIGHTWARD at y=-5 (safe: below conf y=0,
         above bottom-room top y=-10), reach lobby, go down.
         Do NOT go all the way to y=-20 — cross early at y=-5 to avoid bottom-room wall pile-up.
       - Conference: right through mid-gap at y=-5, reach lobby.
       - Bottom rooms: right through lobby to exitB.
       - Exam rooms: trivial, already near right side.

   Waypoint index reference:
     0  = (-21, 19)  Therapy1 door wp          [left arm, y=19]
     1  = (-21,  2)  Therapy2 door wp          [left arm, y=2]
     2  = (-21,-16)  Therapy3 door wp          [left arm, y=-16]
     3  = (  0, -5)  Conference door wp        [mid-gap, 5 below conf door y=0]
     4  = ( -5, -7)  RoomA door wp             [mid-gap, 3 above room top y=-10]
     5  = (  5, -7)  RoomB door wp             [mid-gap, 3 above room top y=-10]
     6  = ( 21, 22)  Exam1 door wp             [top strip, above conf roof y=20]
     7  = ( 21,  7)  Exam2 door wp             [lobby, left of Exam wall x=25]
     8  = (-21, 22)  left arm top strip        [top strip at x=-21, below exitA gap]
     9  = ( 13, 22)  top strip center-right    [top strip, x=13 clears conf right wall x=10]
     10 = (-13, -5)  mid-gap center-left       [mid-gap, x=-13 clears conf left wall x=-10]
     11 = ( 13, -5)  mid-gap center-right      [mid-gap, x=13 clears conf right wall x=10]
     12 = ( 21, -5)  lobby entrance            [mid-gap/lobby, x=21 well right of bottom rooms x=10]
     13 = ( 21,-20)  lobby bottom              [deep in lobby, y=-20, approaching exitB]
     14 = (-21, -5)  left arm low              [left arm at y=-5, clear of all rooms]
   ════════════════════════════════════════════════════════════════════ */
export function createOfficeLayout(scene) {
  const walls = [];
  const doors = [];
  const meshes = [];
  function add(a, b) { makeWall(scene, walls, a, b); }

  /* ── FLOORS ─────────────────────────────────────────────────────── */
  meshes.push(makeFloor(scene, 0, 0, 84, 54, FLOOR_COLOR, -0.3));
  meshes.push(makeFloor(scene, 0, 0, 78, 48, CORRIDOR_COLOR));

  // Left therapy rooms
  meshes.push(makeFloor(scene, -32.5,  17,   15, 16)); // Therapy1: x:-40→-25, y: 9→25
  meshes.push(makeFloor(scene, -32.5,   0.5, 15, 17)); // Therapy2: x:-40→-25, y:-8→ 9
  meshes.push(makeFloor(scene, -32.5, -16.5, 15, 17)); // Therapy3: x:-40→-25, y:-25→-8

  // Central conference room
  meshes.push(makeFloor(scene,  0,  10, 20, 20)); // Conference: x:-10→10, y:0→20

  // Two bottom-center rooms
  meshes.push(makeFloor(scene, -5, -17.5, 10, 15)); // RoomA: x:-10→0,  y:-25→-10
  meshes.push(makeFloor(scene,  5, -17.5, 10, 15)); // RoomB: x:  0→10, y:-25→-10

  // Right exam rooms
  meshes.push(makeFloor(scene, 32.5, 19, 15, 12)); // Exam1: x:25→40, y:13→25
  meshes.push(makeFloor(scene, 32.5,  7, 15, 12)); // Exam2: x:25→40, y: 1→13
  meshes.push(makeFloor(scene, 32.5, -5, 15, 12)); // Exam3: x:25→40, y:-11→ 1

  makeGrid(scene, -40, 40, -25, 25, 4);

  /* ── OUTER WALLS ─────────────────────────────────────────────────
     Top wall gap x:-25→-17 (primary exit)
     Right wall gap y:-23→-15 (secondary exit)
  ─────────────────────────────────────────────────────────────────── */
  add(v(-40,  25), v(-25,  25)); // top — left of exit gap
  add(v(-17,  25), v( 40,  25)); // top — right of exit gap
  add(v(-40, -25), v( 40, -25)); // bottom — solid
  add(v(-40,  25), v(-40, -25)); // left — solid
  add(v( 40,  25), v( 40, -15)); // right — above secondary exit gap
  add(v( 40, -23), v( 40, -25)); // right — below secondary exit gap

  /* ── THERAPY ROOMS: x:-40→-25 ─────────────────────────────────── */
  add(v(-40,   9), v(-25,   9)); // divider T1/T2
  add(v(-40,  -8), v(-25,  -8)); // divider T2/T3

  add(v(-25,  25), v(-25,  21)); // T1 above door
  add(v(-25,  17), v(-25,   9)); // T1 below door
  add(v(-25,   9), v(-25,   4)); // T2 above door
  add(v(-25,   0), v(-25,  -8)); // T2 below door
  add(v(-25,  -8), v(-25, -14)); // T3 above door
  add(v(-25, -18), v(-25, -25)); // T3 below door

  /* ── CENTRAL CONFERENCE ROOM: x:-10→10, y:0→20 ─────────────────── */
  add(v(-10,  20), v( 10,  20)); // top
  add(v(-10,  20), v(-10,   0)); // left
  add(v( 10,  20), v( 10,   0)); // right
  add(v(-10,   0), v( -2,   0)); // bottom — left of door
  add(v(  2,   0), v( 10,   0)); // bottom — right of door

  /* ── BOTTOM-CENTER ROOMS: x:-10→10, y:-25→-10 ─────────────────── */
  add(v(-10, -10), v( -7, -10)); // top — left of RoomA door
  add(v( -3, -10), v(  3, -10)); // top — between doors
  add(v(  7, -10), v( 10, -10)); // top — right of RoomB door
  add(v(-10, -10), v(-10, -25)); // left wall
  add(v( 10, -10), v( 10, -25)); // right wall
  add(v(  0, -10), v(  0, -25)); // divider

  /* ── EXAM ROOMS: x:25→40 ──────────────────────────────────────── */
  add(v( 25,  25), v( 25,  21)); // Exam1 left — above door
  add(v( 25,  17), v( 25,  13)); // Exam1 left — below door
  add(v( 25,  13), v( 40,  13)); // divider Exam1/Exam2
  add(v( 25,  13), v( 25,   9)); // Exam2 left — above door
  add(v( 25,   5), v( 25,   1)); // Exam2 left — below door
  add(v( 25,   1), v( 40,   1)); // divider Exam2/Exam3 (replaces Exam2 bottom/lobby boundary)
  add(v( 25,   1), v( 25,  -1)); // Exam3 left — above door gap
  add(v( 25,  -5), v( 25, -11)); // Exam3 left — below door gap
  add(v( 25, -11), v( 40, -11)); // Exam3 bottom

  /* ── DOOR MARKERS ─────────────────────────────────────────────── */
  doors.push(v(-25,  19)); // 0 Therapy1
  doors.push(v(-25,   2)); // 1 Therapy2
  doors.push(v(-25, -16)); // 2 Therapy3
  doors.push(v(  0,   0)); // 3 Conference — bottom wall y=0
  doors.push(v( -5, -10)); // 4 RoomA — top wall y=-10
  doors.push(v(  5, -10)); // 5 RoomB — top wall y=-10
  doors.push(v( 25,  19)); // 6 Exam1 — left wall x=25, center of gap y:17→21
  doors.push(v( 25,   7)); // 7 Exam2 — left wall x=25, center of gap y:5→9
  doors.push(v( 25,  -3)); // 8 Exam3 — left wall x=25, center of gap y:-5→-1
  doors.forEach((d) => meshes.push(makeDoorMarker(scene, d.x, d.y, false)));

  /* ── EXITS ──────────────────────────────────────────────────────
     exitA (index 0): top-left, pos=(-21, 25)
     exitB (index 1): right wall (lobby), pos=(40, -19)
  ─────────────────────────────────────────────────────────────────── */
  const exitA = makeExit(scene, -21,  25, false); // primary — top-left
  exitA.pos = v(-21, 25);
  exitA.approachPt = v(-21, 22);  // in top strip just below exit gap, left arm

  const exitB = makeExit(scene,  40, -19, true);  // secondary — right wall
  exitB.pos = v(40, -19);
  exitB.approachPt = v(28, -19);  // deep in lobby, well past Exam2 bottom (y=1)




  /* ── WAYPOINTS ──────────────────────────────────────────────────
     Index reference:
       0  = (-21, 19)  Therapy1 door wp [left arm, y=19]
       1  = (-21,  2)  Therapy2 door wp [left arm, y=2]  (NOTE: y=2 is above conf bottom y=0, in left arm x=-21 not inside conf x:-10→10)
       2  = (-21,-16)  Therapy3 door wp [left arm, y=-16]
       3  = (  0, -5)  Conference door wp [mid-gap, y=-5, below conf door y=0]
       4  = ( -5, -7)  RoomA door wp [mid-gap, y=-7, 3 above room top y=-10]
       5  = (  5, -7)  RoomB door wp [mid-gap, y=-7, 3 above room top y=-10]
       6  = ( 33, 19)  Exam1 INTERNAL staging wp [inside room near door height y=19, pulls agents to door-gap y before exiting]
       7  = ( 21,  7)  Exam2 door wp [left of wall x=25, inside door gap y:5→9]
       8  = (-21, 22)  left arm top strip [y=22, below exitA gap at y=25]
       9  = ( 21, 22)  top strip right staging [y=22, x=21 — above conf roof y=20, agents rise here before crossing left]
      10  = (-13, -2)  mid-gap crossing A [y=-2, for Therapy1 → spreads load across different y]
      11  = ( 13, -2)  mid-gap crossing A right [y=-2]
      12  = (-13, -5)  mid-gap crossing B [y=-5, for Therapy2 / Conference / RoomA/B]
      13  = ( 13, -5)  mid-gap crossing B right [y=-5]
      14  = (-13, -8)  mid-gap crossing C [y=-8, for Therapy3 — just above bottom-room top y=-10]
      15  = ( 13, -8)  mid-gap crossing C right [y=-8]
      16  = ( 21, -5)  lobby entrance [x=21, y=-5, right of bottom rooms x=10, left of exam wall x=25]
      17  = ( 21,-20)  lobby bottom [deep in lobby, approaching exitB]
      18  = (-21, -5)  left arm low [y=-5 in left arm]
      19  = ( 21, 19)  Exam1 CORRIDOR staging wp [x=21 left of wall x=25, at door-gap height y=19 — first wp after agent exits Exam1 through door]
  ─────────────────────────────────────────────────────────────────── */
  const waypoints = [
    new THREE.Vector2(-21,  19), //  0 Therapy1 door wp
    new THREE.Vector2(-21,   2), //  1 Therapy2 door wp
    new THREE.Vector2(-21, -16), //  2 Therapy3 door wp
    new THREE.Vector2(  0,  -5), //  3 Conference door wp
    new THREE.Vector2( -5,  -7), //  4 RoomA door wp
    new THREE.Vector2(  5,  -7), //  5 RoomB door wp
    new THREE.Vector2( 33,  19), //  6 Exam1 INTERNAL staging (inside room, near door y=19)
    new THREE.Vector2( 21,   7), //  7 Exam2 door wp
    new THREE.Vector2(-21,  22), //  8 left arm top strip
    new THREE.Vector2( 21,  22), //  9 top strip right staging
    new THREE.Vector2(-13,  -2), // 10 mid-gap crossing A left  (y=-2)
    new THREE.Vector2( 13,  -2), // 11 mid-gap crossing A right (y=-2)
    new THREE.Vector2(-13,  -5), // 12 mid-gap crossing B left  (y=-5)
    new THREE.Vector2( 13,  -5), // 13 mid-gap crossing B right (y=-5)
    new THREE.Vector2(-13,  -6), // 14 mid-gap crossing C left  (y=-6, for Therapy3)
                                 //    y=-6 keeps 4 units above bottom-center room top-left corner
                                 //    (-10,-10), well outside the 1.2-unit avoidance range even
                                 //    under crowd pressure. Previous y=-8 was only 2 units above.
    new THREE.Vector2( 13,  -6), // 15 mid-gap crossing C right (y=-6)
    new THREE.Vector2( 21,  -5), // 16 lobby entrance
    new THREE.Vector2( 21, -20), // 17 lobby bottom
    new THREE.Vector2(-21,  -5), // 18 left arm low
    new THREE.Vector2( 21,  19), // 19 Exam1 corridor staging (x=21, y=19, just left of wall x=25)
    new THREE.Vector2(-21,  -3), // 20 left arm descent: y=-3 so path to any mid-gap crossing
                                 //    crosses x=-10 at y≤-2.6, keeping ≥2.6 units from the
                                 //    conf-left-wall bottom endpoint (-10,0). Prevents trapping
                                 //    at the concave corner (-10,0) under crowd pressure.
    new THREE.Vector2( 21,  23), // 21 right-side ascent anchor: y=23 (3 above conf roof y=20).
                                 //    Corner (10,20) is sqrt(121+9)=11.4 away — safe even under
                                 //    1-unit crowd drift. Agents must reach here before crossing
                                 //    left, keeping them well clear of the concave corner (10,20).
    new THREE.Vector2(-13,  -3), // 22 mid-gap crossing A left, lowered to y=-3 to stay clear of
                                 //    conf-left-wall endpoint (-10,0) during the rightward crossing.
                                 //    Replaces wp10 for Therapy1 which exits at y=19 (highest up).
    new THREE.Vector2( 13,  23), // 23 top strip crossing right: y=23, x=13. Used as intermediate
                                 //    after wp21 to keep agents at safe height while moving left
                                 //    past the conf top-right corner before reaching wp8=(-21,22).
    new THREE.Vector2( 33,  -3), // 24 Exam3 INTERNAL staging (inside room, near door y=-3)
    new THREE.Vector2( 21,  -3), // 25 Exam3 corridor staging (x=21, just left of wall x=25, y=-3)
  ];

  /* ── ROOMS ──────────────────────────────────────────────────────
     routeChainByExit: { 0: exitA (top-left), 1: exitB (right/bottom) }

     CORNER-AVOIDANCE STRATEGY:
     Two concave wall corners cause agent trapping under crowd pressure:

     Corner R = (10, 20): conf right wall meets conf top wall.
       Right-side agents (Exam1/2) heading to exitA must pass this corner.
       Fix: force ascent to y=23 (wp21) before crossing left. From y=23
       the corner is sqrt(121+9)=11.4 away. Then step via (13,23) (wp23)
       which is sqrt(9+9)=4.2 from the corner — safe. Then cross to (-21,22).

     Corner L = (-10, 0): conf left wall meets conf bottom-left wall segment.
       Left-side agents (Therapy1/2) heading to exitB descend the left arm
       and then cross right. Fix: force descent to y=-3 (wp20) before crossing.
       Then Therapy1 crosses horizontally at y=-3 via wp22=(-13,-3): closest
       point to corner (-10,0) is (-10,-3), dist=3 ✓. Therapy2 crosses at y=-5
       via wp12=(-13,-5): path from (-21,-3) crosses x=-10 at y≈-3.9, dist=3.9 ✓.
  ─────────────────────────────────────────────────────────────────── */
  const rooms = [
    {
      xMin: -40, xMax: -25, yMin:  9, yMax: 25,
      doorIndices: [0],
      routeChain: [0],
      routeChainByExit: {
        0: [0, 8],
        // exitB: descend left arm to y=-3 (wp20), then cross HORIZONTALLY at y=-3 via wp22=(-13,-3)
        // then continue right via wp11=(13,-2) → lobby. The horizontal segment (-21,-3)→(-13,-3)
        // never approaches corner (-10,0): closest point is (-10,-3), dist=3 ✓
        1: [0, 20, 22, 11, 16, 17],
      }
    }, // Therapy1
    {
      xMin: -40, xMax: -25, yMin: -8, yMax:  9,
      doorIndices: [1],
      routeChain: [1],
      routeChainByExit: {
        0: [1, 8],
        // exitB: descend to y=-3 (wp20) then cross at y=-5 via wp12/13
        // path (-21,-3)→(-13,-5) crosses x=-10 at y≈-3.9, dist to (-10,0)=3.9 ✓
        1: [1, 20, 12, 13, 16, 17],
      }
    }, // Therapy2
    {
      xMin: -40, xMax: -25, yMin: -25, yMax: -8,
      doorIndices: [2],
      routeChain: [2],
      routeChainByExit: {
        0: [2, 1, 8],
        1: [2, 14, 15, 16, 17],
      }
    }, // Therapy3
    {
      xMin: -10, xMax: 10, yMin:  0, yMax: 20,
      doorIndices: [3],
      routeChain: [3],
      routeChainByExit: {
        0: [3, 12, 18, 1, 8],
        1: [3, 13, 16, 17],
      }
    }, // Conference
    {
      xMin: -10, xMax:  0, yMin: -25, yMax: -10,
      doorIndices: [4],
      routeChain: [4],
      routeChainByExit: {
        0: [4, 12, 18, 1, 8],
        1: [4, 16, 17],
      }
    }, // RoomA
    {
      xMin:  0, xMax: 10, yMin: -25, yMax: -10,
      doorIndices: [5],
      routeChain: [5],
      routeChainByExit: {
        0: [5, 12, 18, 1, 8],
        1: [5, 16, 17],
      }
    }, // RoomB
    {
      xMin:  25, xMax: 40, yMin: 13, yMax: 25,
      doorIndices: [6],
      routeChain: [6],
      routeChainByExit: {
        // exitA: internal(6) → corridor(19,x=21,y=19) → ascent anchor(21,x=21,y=23)
        //   → top-strip step(23,x=13,y=23) → left top(8,x=-21,y=22)
        //   At wp23=(13,23): dist to corner(10,20)=sqrt(9+9)=4.2 ✓ safe even under crowd push
        0: [6, 19, 21, 23, 8],
        1: [6, 19, 17],
      }
    }, // Exam1
    {
      xMin:  25, xMax: 40, yMin:  1, yMax: 13,
      doorIndices: [7],
      routeChain: [7],
      routeChainByExit: {
        // exitA: door(7,x=21,y=7) → ascent anchor(21,x=21,y=23) → top-strip step(23,x=13,y=23) → left top(8)
        0: [7, 21, 23, 8],
        1: [7, 17],
      }
    }, // Exam2
    {
      xMin:  25, xMax: 40, yMin: -11, yMax:  1,
      doorIndices: [8],
      routeChain: [24],
      routeChainByExit: {
        // exitA: internal(24,x=33,y=-3) → corridor(25,x=21,y=-3) → ascent(21,y=23) → top-strip(23) → left(8)
        0: [24, 25, 21, 23, 8],
        // exitB: internal(24) → corridor(25,x=21,y=-3) → lobby bottom(17)
        1: [24, 25, 17],
      }
    }, // Exam3
    { xMin: -40, xMax:  40, yMin: -25, yMax:  25, doorIndices: [], inCorridor: true },
  ];

  /* ── SPAWN ZONES ─────────────────────────────────────────────── */
  const spawnZones = [
    { cx: -32.5, cy:  17,   w: 12, h: 13 }, // Therapy1
    { cx: -32.5, cy:   0.5, w: 12, h: 14 }, // Therapy2
    { cx: -32.5, cy: -16.5, w: 12, h: 14 }, // Therapy3
    { cx:   0,   cy:  10,   w: 16, h: 16 }, // Conference
    { cx:  -5,   cy: -17.5, w:  8, h: 12 }, // RoomA
    { cx:   5,   cy: -17.5, w:  8, h: 12 }, // RoomB
    { cx:  32.5, cy:  19,   w: 12, h:  9 }, // Exam1
    { cx:  32.5, cy:   7,   w: 12, h:  9 }, // Exam2
    { cx:  32.5, cy:  -5,   w: 12, h:  9 }, // Exam3
  ];

  return {
    walls, doors, meshes,
    exits: [exitA, exitB],
    rooms, spawnZones, waypoints,
    corridorCenter: new THREE.Vector2(-5, 0),
    name: 'office'
  };
}