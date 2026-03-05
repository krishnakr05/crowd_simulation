import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Wall from "./wall.js";

export function createBuilding(scene) {
  const walls = [];
  const doors = [];

  function v(x, y) { return new THREE.Vector2(x, y); }

  function add(a, b) {
    const w = new Wall(a, b);
    walls.push(w);
    scene.add(w.mesh);
  }

  /* OUTER BUILDING */
  add(v(-30, -20), v(-4, -20));  // bottom wall left of exit
  add(v(4, -20), v(30, -20));    // bottom wall right of exit
  add(v(-30, 20), v(30, 20));    // top wall
  add(v(-30, -20), v(-30, 20));  // left wall
  add(v(30, -20), v(30, 20));    // right wall

  /* LEFT CORRIDOR WALL (with door gaps) */
  // FIXED: Removed duplicate wall segments that were re-added below
  add(v(-5, 20), v(-5, 12));   // above top-left door
  add(v(-5, 8), v(-5, 2));     // between top-left and mid-left door
  add(v(-5, -2), v(-5, -12));  // between mid-left and bottom-left door
  add(v(-5, -16), v(-5, -20)); // below bottom-left door

  /* RIGHT CORRIDOR WALL (with door gaps) */
  add(v(5, 20), v(5, 12));    // above top-right door
  add(v(5, 8), v(5, 2));      // between top-right and mid-right door
  add(v(5, -2), v(5, -12));   // between mid-right and bottom-right door
  add(v(5, -16), v(5, -20));  // below bottom-right door

  /* ROOM SEPARATORS */
  add(v(-30, 7), v(-5, 7));
  add(v(-30, -7), v(-5, -7));
  add(v(5, 7), v(30, 7));
  add(v(5, -7), v(30, -7));

  /* DOOR POSITIONS — FIXED: removed duplicates, each door listed once */
  doors.push(v(-5, 10));   // top-left door
  doors.push(v(-5, 0));    // mid-left door
  doors.push(v(-5, -14));  // bottom-left door
  doors.push(v(5, 10));    // top-right door
  doors.push(v(5, 0));     // mid-right door
  doors.push(v(5, -14));   // bottom-right door

  /* MAIN EXIT */
  const exit = v(0, -20);

  const exitMesh = new THREE.Mesh(
    new THREE.BoxGeometry(8, 2, 1),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  exitMesh.position.set(exit.x, -19, 0);
  scene.add(exitMesh);

  return { walls, doors, exit };
}
