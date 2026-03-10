import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Wall from "./wall.js";

const ROOM_COLOR      = 0x0d1b2a;
const CORRIDOR_COLOR  = 0x0a1520;
const FLOOR_COLOR     = 0x060e18;
const COURTYARD_COLOR = 0x071510;

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
  exitBottom.pos = v(0, -20);
  exitBottom.approachPt = v(0, -16);
  exitBottom.gapXMin = -4; exitBottom.gapXMax = 4;
  exitBottom.gapYMin = -22; exitBottom.gapYMax = -18;

  const exitTop = makeExit(scene, 0, 20);
  exitTop.pos = v(0, 20);
  exitTop.approachPt = v(0, 16);
  exitTop.gapXMin = -4; exitTop.gapXMax = 4;
  exitTop.gapYMin = 18; exitTop.gapYMax = 22;

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

  meshes.push(makeFloor(scene, 0, 0, 84, 54, FLOOR_COLOR, -0.3));
  meshes.push(makeFloor(scene, 0, 0, 80, 50, CORRIDOR_COLOR));
  meshes.push(makeFloor(scene, 0, 0, 32, 24, COURTYARD_COLOR, -0.15));

  meshes.push(makeFloor(scene, -15, 21, 14, 8));
  meshes.push(makeFloor(scene,   0, 21, 16, 8));
  meshes.push(makeFloor(scene,  15, 21, 14, 8));
  meshes.push(makeFloor(scene, -15,-21, 14, 8));
  meshes.push(makeFloor(scene,   0,-21, 16, 8));
  meshes.push(makeFloor(scene,  15,-21, 14, 8));
  meshes.push(makeFloor(scene, -35, 0, 10, 20));
  meshes.push(makeFloor(scene,  35, 0, 10, 20));

  makeGrid(scene, -40, 40, -25, 25, 4);

  add(v(-32,  25), v( 32,  25));
  add(v(-32, -25), v( 32, -25));
  add(v(-40,  25), v(-40, -25));
  add(v( 40,  25), v( 40, -25));

  add(v(-16,  12), v( 16,  12));
  add(v(-16, -12), v( 16, -12));
  add(v(-16,  12), v(-16, -12));
  add(v( 16,  12), v( 16, -12));

  add(v(-22, 25), v(-22, 17));
  add(v( -8, 25), v( -8, 17));
  add(v(-22, 17), v(-17, 17));
  add(v(-11, 17), v( -8, 17));

  add(v(8, 25), v(8, 17));
  add(v(-8, 17), v(-3, 17));
  add(v( 3, 17), v( 8, 17));

  add(v(22, 25), v(22, 17));
  add(v( 8, 17), v(11, 17));
  add(v(17, 17), v(22, 17));

  add(v(-22, -25), v(-22, -17));
  add(v( -8, -25), v( -8, -17));
  add(v(-22, -17), v(-17, -17));
  add(v(-11, -17), v( -8, -17));

  add(v(8, -25), v(8, -17));
  add(v(-8, -17), v(-3, -17));
  add(v( 3, -17), v( 8, -17));

  add(v(22, -25), v(22, -17));
  add(v( 8, -17), v(11, -17));
  add(v(17, -17), v(22, -17));

  add(v(-40,  10), v(-30,  10));
  add(v(-40, -10), v(-30, -10));
  add(v(-30,  10), v(-30,   3));
  add(v(-30,  -3), v(-30, -10));

  add(v( 30,  10), v( 40,  10));
  add(v( 30, -10), v( 40, -10));
  add(v( 30,  10), v( 30,   3));
  add(v( 30,  -3), v( 30, -10));

  doors.push(v(-14,  17));
  doors.push(v(  0,  17));
  doors.push(v( 14,  17));
  doors.push(v(-14, -17));
  doors.push(v(  0, -17));
  doors.push(v( 14, -17));
  doors.push(v(-30,   0));
  doors.push(v( 30,   0));
  doors.forEach((d, i) => makeDoorMarker(scene, d.x, d.y, i >= 6));

  const exitNW = makeExit(scene, -36,  25, false); exitNW.pos = v(-36,  25); exitNW.approachPt = v(-29,  13); exitNW.columnPt = v(-27, 11); exitNW.gapXMin=-40; exitNW.gapXMax=-32; exitNW.gapYMin=23; exitNW.gapYMax=27;
  const exitNE = makeExit(scene,  36,  25, false); exitNE.pos = v( 36,  25); exitNE.approachPt = v( 29,  13); exitNE.columnPt = v( 27, 11); exitNE.gapXMin= 32; exitNE.gapXMax= 40; exitNE.gapYMin=23; exitNE.gapYMax=27;
  const exitSW = makeExit(scene, -36, -25, false); exitSW.pos = v(-36, -25); exitSW.approachPt = v(-29, -13); exitSW.columnPt = v(-27,-11); exitSW.gapXMin=-40; exitSW.gapXMax=-32; exitSW.gapYMin=-27; exitSW.gapYMax=-23;
  const exitSE = makeExit(scene,  36, -25, false); exitSE.pos = v( 36, -25); exitSE.approachPt = v( 29, -13); exitSE.columnPt = v( 27,-11); exitSE.gapXMin= 32; exitSE.gapXMax= 40; exitSE.gapYMin=-27; exitSE.gapYMax=-23;

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
    new THREE.Vector2(-14,  13),
    new THREE.Vector2(  0,  13),
    new THREE.Vector2( 14,  13),
    new THREE.Vector2(-14, -13),
    new THREE.Vector2(  0, -13),
    new THREE.Vector2( 14, -13),
    new THREE.Vector2(-25,   0),
    new THREE.Vector2( 25,   0),
    new THREE.Vector2(-25,  11),
    new THREE.Vector2(-25, -11),
    new THREE.Vector2( 25,  11),
    new THREE.Vector2( 25, -11),
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
   ════════════════════════════════════════════════════════════════════ */
export function createOfficeLayout(scene) {
  const walls = [];
  const doors = [];
  const meshes = [];
  function add(a, b) { makeWall(scene, walls, a, b); }

  meshes.push(makeFloor(scene, 0, 0, 84, 54, FLOOR_COLOR, -0.3));
  meshes.push(makeFloor(scene, 0, 0, 78, 48, CORRIDOR_COLOR));

  meshes.push(makeFloor(scene, -32.5,  17,   15, 16));
  meshes.push(makeFloor(scene, -32.5,   0.5, 15, 17));
  meshes.push(makeFloor(scene, -32.5, -16.5, 15, 17));

  meshes.push(makeFloor(scene,  0,  10, 20, 20));

  meshes.push(makeFloor(scene, -5, -17.5, 10, 15));
  meshes.push(makeFloor(scene,  5, -17.5, 10, 15));

  meshes.push(makeFloor(scene, 32.5, 19, 15, 12));
  meshes.push(makeFloor(scene, 32.5,  7, 15, 12));
  meshes.push(makeFloor(scene, 32.5, -5, 15, 12));

  makeGrid(scene, -40, 40, -25, 25, 4);

  add(v(-40,  25), v(-25,  25));
  add(v(-17,  25), v( 40,  25));
  add(v(-40, -25), v( 40, -25));
  add(v(-40,  25), v(-40, -25));
  add(v( 40,  25), v( 40, -15));
  add(v( 40, -23), v( 40, -25));

  add(v(-40,   9), v(-25,   9));
  add(v(-40,  -8), v(-25,  -8));

  add(v(-25,  25), v(-25,  21));
  add(v(-25,  17), v(-25,   9));
  add(v(-25,   9), v(-25,   4));
  add(v(-25,   0), v(-25,  -8));
  add(v(-25,  -8), v(-25, -14));
  add(v(-25, -18), v(-25, -25));

  add(v(-10,  20), v( 10,  20));
  add(v(-10,  20), v(-10,   0));
  add(v( 10,  20), v( 10,   0));
  add(v(-10,   0), v( -2,   0));
  add(v(  2,   0), v( 10,   0));

  add(v(-10, -10), v( -7, -10));
  add(v( -3, -10), v(  3, -10));
  add(v(  7, -10), v( 10, -10));
  add(v(-10, -10), v(-10, -25));
  add(v( 10, -10), v( 10, -25));
  add(v(  0, -10), v(  0, -25));

  add(v( 25,  25), v( 25,  21));
  add(v( 25,  17), v( 25,  13));
  add(v( 25,  13), v( 40,  13));
  add(v( 25,  13), v( 25,   9));
  add(v( 25,   5), v( 25,   1));
  add(v( 25,   1), v( 40,   1));
  add(v( 25,   1), v( 25,  -1));
  add(v( 25,  -5), v( 25, -11));
  add(v( 25, -11), v( 40, -11));

  doors.push(v(-25,  19));
  doors.push(v(-25,   2));
  doors.push(v(-25, -16));
  doors.push(v(  0,   0));
  doors.push(v( -5, -10));
  doors.push(v(  5, -10));
  doors.push(v( 25,  19));
  doors.push(v( 25,   7));
  doors.push(v( 25,  -3));
  doors.forEach((d) => makeDoorMarker(scene, d.x, d.y, false));

  const exitA = makeExit(scene, -21,  25, false);
  exitA.pos = v(-21, 25);
  exitA.approachPt = v(-21, 22);
  exitA.gapXMin = -25; exitA.gapXMax = -17;
  exitA.gapYMin = 23; exitA.gapYMax = 27;

  const exitB = makeExit(scene,  40, -19, true);
  exitB.pos = v(40, -19);
  exitB.approachPt = v(28, -19);
  exitB.gapXMin = 38; exitB.gapXMax = 42;
  exitB.gapYMin = -23; exitB.gapYMax = -15;

  const waypoints = [
    new THREE.Vector2(-21,  19),
    new THREE.Vector2(-21,   2),
    new THREE.Vector2(-21, -16),
    new THREE.Vector2(  0,  -5),
    new THREE.Vector2( -5,  -7),
    new THREE.Vector2(  5,  -7),
    new THREE.Vector2( 33,  19),
    new THREE.Vector2( 21,   7),
    new THREE.Vector2(-21,  22),
    new THREE.Vector2( 21,  22),
    new THREE.Vector2(-13,  -2),
    new THREE.Vector2( 13,  -2),
    new THREE.Vector2(-13,  -5),
    new THREE.Vector2( 13,  -5),
    new THREE.Vector2(-13,  -6),
    new THREE.Vector2( 13,  -6),
    new THREE.Vector2( 21,  -5),
    new THREE.Vector2( 21, -20),
    new THREE.Vector2(-21,  -5),
    new THREE.Vector2( 21,  19),
    new THREE.Vector2(-21,  -3),
    new THREE.Vector2( 21,  23),
    new THREE.Vector2(-13,  -3),
    new THREE.Vector2( 13,  23),
    new THREE.Vector2( 33,  -3),
    new THREE.Vector2( 21,  -3),
  ];

  const rooms = [
    {
      xMin: -40, xMax: -25, yMin:  9, yMax: 25,
      doorIndices: [0],
      routeChain: [0],
      routeChainByExit: {
        0: [0, 8],
        1: [0, 20, 22, 11, 16, 17],
      }
    },
    {
      xMin: -40, xMax: -25, yMin: -8, yMax:  9,
      doorIndices: [1],
      routeChain: [1],
      routeChainByExit: {
        0: [1, 8],
        1: [1, 20, 12, 13, 16, 17],
      }
    },
    {
      xMin: -40, xMax: -25, yMin: -25, yMax: -8,
      doorIndices: [2],
      routeChain: [2],
      routeChainByExit: {
        0: [2, 1, 8],
        1: [2, 14, 15, 16, 17],
      }
    },
    {
      xMin: -10, xMax: 10, yMin:  0, yMax: 20,
      doorIndices: [3],
      routeChain: [3],
      routeChainByExit: {
        0: [3, 12, 18, 1, 8],
        1: [3, 13, 16, 17],
      }
    },
    {
      xMin: -10, xMax:  0, yMin: -25, yMax: -10,
      doorIndices: [4],
      routeChain: [4],
      routeChainByExit: {
        0: [4, 12, 18, 1, 8],
        1: [4, 16, 17],
      }
    },
    {
      xMin:  0, xMax: 10, yMin: -25, yMax: -10,
      doorIndices: [5],
      routeChain: [5],
      routeChainByExit: {
        0: [5, 12, 18, 1, 8],
        1: [5, 16, 17],
      }
    },
    {
      xMin:  25, xMax: 40, yMin: 13, yMax: 25,
      doorIndices: [6],
      routeChain: [6],
      routeChainByExit: {
        0: [6, 19, 21, 23, 8],
        1: [6, 19, 17],
      }
    },
    {
      xMin:  25, xMax: 40, yMin:  1, yMax: 13,
      doorIndices: [7],
      routeChain: [7],
      routeChainByExit: {
        0: [7, 21, 23, 8],
        1: [7, 17],
      }
    },
    {
      xMin:  25, xMax: 40, yMin: -11, yMax:  1,
      doorIndices: [8],
      routeChain: [24],
      routeChainByExit: {
        0: [24, 25, 21, 23, 8],
        1: [24, 25, 17],
      }
    },
    { xMin: -40, xMax:  40, yMin: -25, yMax:  25, doorIndices: [], inCorridor: true },
  ];

  const spawnZones = [
    { cx: -32.5, cy:  17,   w: 12, h: 13 },
    { cx: -32.5, cy:   0.5, w: 12, h: 14 },
    { cx: -32.5, cy: -16.5, w: 12, h: 14 },
    { cx:   0,   cy:  10,   w: 16, h: 16 },
    { cx:  -5,   cy: -17.5, w:  8, h: 12 },
    { cx:   5,   cy: -17.5, w:  8, h: 12 },
    { cx:  32.5, cy:  19,   w: 12, h:  9 },
    { cx:  32.5, cy:   7,   w: 12, h:  9 },
    { cx:  32.5, cy:  -5,   w: 12, h:  9 },
  ];

  return {
    walls, doors, meshes,
    exits: [exitA, exitB],
    rooms, spawnZones, waypoints,
    corridorCenter: new THREE.Vector2(-5, 0),
    name: 'office'
  };
}