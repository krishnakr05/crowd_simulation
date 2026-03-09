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

   Outer building:  x:-40→40,  y:-25→25
   Courtyard block: x:-16→16,  y:-12→12
   Corner neutral zones (NO walls): x:±32→±40, y:±17→±25

   Top classrooms    (y:17→25, inner wall y=17, divider x=±8):
     CL1: x:-32→-8   CL2: x:-8→8   CL3: x:8→32
     (walls stop at x=±32 — corner zones are free)
   Bottom classrooms (y:-25→-17, mirror):
     CL4: x:-32→-8   CL5: x:-8→8   CL6: x:8→32
   Left classrooms   (x:-40→-30, inner wall x=-30, divider y=0):
     CL7: y:0→17     CL8: y:-17→0
   Right classrooms  (x:30→40, inner wall x=30, divider y=0):
     CL9: y:0→17     CL10: y:-17→0

   Corridor = everything except classrooms and courtyard.
   Minimum corridor width = 5 units (between courtyard and classrooms).

   Exits (8-unit gaps) at corners of outer wall:
     NW: top wall    x:-40→-32, marker (-36, 25)
     NE: top wall    x: 32→ 40, marker ( 36, 25)
     SW: bottom wall x:-40→-32, marker (-36,-25)
     SE: bottom wall x: 32→ 40, marker ( 36,-25)
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

  /* ── OUTER WALLS ─────────────────────────────────────────────────
     Top/bottom: center section only x:-32→32 (corners are exit gaps)
     Left/right: solid full height
  ─────────────────────────────────────────────────────────────────── */
  add(v(-32,  25), v( 32,  25)); // top wall (center, exits at corners)
  add(v(-32, -25), v( 32, -25)); // bottom wall
  add(v(-40,  25), v(-40, -25)); // left wall (solid)
  add(v( 40,  25), v( 40, -25)); // right wall (solid)

  /* ── COURTYARD WALLS ─────────────────────────────────────────────── */
  add(v(-16,  12), v( 16,  12));
  add(v(-16, -12), v( 16, -12));
  add(v(-16,  12), v(-16, -12));
  add(v( 16,  12), v( 16, -12));

  /* ── CLASSROOM WALLS ─────────────────────────────────────────────
     Rules:
     - Outer walls coinciding with building perimeter: OMIT
     - Corner neutral zones x:±32→±40, y:±17→±25: NO walls
       → CL1 has no left wall (x=-32 is corner zone boundary — stop there)
       → CL3 has no right wall (x=32 is corner zone boundary)
       → CL7/CL9 top walls stop at y=17 (inner wall IS at y=17, no issue)
     - Dividers between adjacent rooms: draw as shared wall (one line only)

     Door gaps (6 units wide):
       CL1: inner wall y=17, gap centered x=-20 → x:-23→-17
       CL2: inner wall y=17, gap centered x=0   → x:-3→3
       CL3: inner wall y=17, gap centered x=20  → x:17→23
       CL4-6: mirror of CL1-3 at y=-17
       CL7: inner wall x=-30, gap centered y=8  → y:5→11
       CL8: inner wall x=-30, gap centered y=-8 → y:-11→-5
       CL9: inner wall x=30,  gap centered y=8  → y:5→11
       CL10:inner wall x=30,  gap centered y=-8 → y:-11→-5
  ─────────────────────────────────────────────────────────────────── */

  // ── CL1: x:-22→-8, y:17→25 ──
  add(v(-22, 25), v(-22, 17)); // CL1 left wall
  add(v( -8, 25), v( -8, 17)); // CL1/CL2 divider
  add(v(-22, 17), v(-17, 17)); // CL1 inner — left of door (gap x:-17→-11, center x=-14)
  add(v(-11, 17), v( -8, 17)); // CL1 inner — right of door

  // ── CL2: x:-8→8, y:17→25 ──
  add(v(8, 25), v(8, 17));
  add(v(-8, 17), v(-3, 17));
  add(v( 3, 17), v( 8, 17));

  // ── CL3: x:8→22, y:17→25 ──
  add(v(22, 25), v(22, 17));   // CL3 right wall
  add(v( 8, 17), v(11, 17));   // CL3 inner — left of door (gap x:11→17, center x=14)
  add(v(17, 17), v(22, 17));   // CL3 inner — right of door

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

  // ── CL7 (left): x:-40→-30, y:-10→10 — single room, door centered on inner wall ──
  add(v(-40,  10), v(-30,  10)); // top wall
  add(v(-40, -10), v(-30, -10)); // bottom wall
  // Inner wall x=-30, door gap centered y=0 → y:-3→3
  add(v(-30,  10), v(-30,   3)); // inner — above door
  add(v(-30,  -3), v(-30, -10)); // inner — below door

  // ── CL8 (right): x:30→40, y:-10→10 — mirror of CL7 ──
  add(v( 30,  10), v( 40,  10));
  add(v( 30, -10), v( 40, -10));
  add(v( 30,  10), v( 30,   3));
  add(v( 30,  -3), v( 30, -10));

  /* ── DOORS ───────────────────────────────────────────────────────── */
  doors.push(v(-14,  17)); // 0 CL1 — gap x:-17→-11, center x=-14
  doors.push(v(  0,  17)); // 1 CL2
  doors.push(v( 14,  17)); // 2 CL3 — gap x:11→17, center x=14
  doors.push(v(-14, -17)); // 3 CL4
  doors.push(v(  0, -17)); // 4 CL5
  doors.push(v( 14, -17)); // 5 CL6
  doors.push(v(-30,   0)); // 6 CL7
  doors.push(v( 30,   0)); // 7 CL8
  doors.forEach((d, i) => makeDoorMarker(scene, d.x, d.y, i >= 6));

  /* ── EXITS ───────────────────────────────────────────────────────── */
  // approachPt is at x=±29, y=±13 — just outside CL7/CL8 inner walls (x=±30),
  // above/below CL7/CL8 vertical bounds (y:-10→10). All paths to approachPt
  // stay in open corridor and never cross any room.
  const exitNW = makeExit(scene, -36,  25, false); exitNW.pos = v(-36,  25); exitNW.approachPt = v(-29,  13); exitNW.columnPt = v(-27, 11);
  const exitNE = makeExit(scene,  36,  25, false); exitNE.pos = v( 36,  25); exitNE.approachPt = v( 29,  13); exitNE.columnPt = v( 27, 11);
  const exitSW = makeExit(scene, -36, -25, false); exitSW.pos = v(-36, -25); exitSW.approachPt = v(-29, -13); exitSW.columnPt = v(-27,-11);
  const exitSE = makeExit(scene,  36, -25, false); exitSE.pos = v( 36, -25); exitSE.approachPt = v( 29, -13); exitSE.columnPt = v( 27,-11);

  /* ── ROOMS ───────────────────────────────────────────────────────── */
  const rooms = [
    { xMin: -22, xMax:  -8, yMin:  17, yMax:  25, doorIndices: [0] }, // CL1
    { xMin:  -8, xMax:   8, yMin:  17, yMax:  25, doorIndices: [1] }, // CL2
    { xMin:   8, xMax:  22, yMin:  17, yMax:  25, doorIndices: [2] }, // CL3
    { xMin: -22, xMax:  -8, yMin: -25, yMax: -17, doorIndices: [3] }, // CL4
    { xMin:  -8, xMax:   8, yMin: -25, yMax: -17, doorIndices: [4] }, // CL5
    { xMin:   8, xMax:  22, yMin: -25, yMax: -17, doorIndices: [5] }, // CL6
    { xMin: -40, xMax: -29.5, yMin: -10, yMax:  10, doorIndices: [6] }, // CL7 left
    { xMin:  29.5, xMax:  40, yMin: -10, yMax:  10, doorIndices: [7] }, // CL8 right
    { xMin: -16, xMax:  16, yMin: -12, yMax:  12, doorIndices: [], isBlocked: true },
    { xMin: -40, xMax:  40, yMin: -25, yMax:  25, doorIndices: [], inCorridor: true },
  ];

  const spawnZones = [
    { cx: -15, cy:  21, w: 10, h: 5 }, // CL1
    { cx:   0, cy:  21, w: 12, h: 5 }, // CL2
    { cx:  15, cy:  21, w: 10, h: 5 }, // CL3
    { cx: -15, cy: -21, w: 10, h: 5 }, // CL4
    { cx:   0, cy: -21, w: 12, h: 5 }, // CL5
    { cx:  15, cy: -21, w: 10, h: 5 }, // CL6
    { cx: -35, cy:   0, w:  7, h: 16 }, // CL7
    { cx:  35, cy:   0, w:  7, h: 16 }, // CL8
  ];

  const waypoints = [
    new THREE.Vector2(-14,  13), // 0 CL1
    new THREE.Vector2(  0,  13), // 1 CL2
    new THREE.Vector2( 14,  13), // 2 CL3
    new THREE.Vector2(-14, -13), // 3 CL4
    new THREE.Vector2(  0, -13), // 4 CL5
    new THREE.Vector2( 14, -13), // 5 CL6
    new THREE.Vector2(-25,   0), // 6 CL7 — 5 units past inner wall x=-30
    new THREE.Vector2( 25,   0), // 7 CL8 — 5 units past inner wall x=30
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