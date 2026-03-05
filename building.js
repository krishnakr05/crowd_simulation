import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import Wall from "./wall.js";

export function createBuilding(scene){

const walls=[];
const doors=[];

function v(x,y){ return new THREE.Vector2(x,y); }

function add(a,b){
  const w=new Wall(a,b);
  walls.push(w);
  scene.add(w.mesh);
}

/* OUTER BUILDING */

add(v(-30,-20),v(-4,-20));
add(v(4,-20),v(30,-20));

add(v(-30,20),v(30,20));
add(v(-30,-20),v(-30,20));
add(v(30,-20),v(30,20));

/* CORRIDOR WALLS */

/* CORRIDOR WALLS WITH DOORS */

/* LEFT corridor wall */

add(v(-5,20),v(-5,12));
add(v(-5,8),v(-5,2));
add(v(-5,-2),v(-5,-12));
add(v(-5,-16),v(-5,-20));

/* RIGHT corridor wall */

add(v(5,20),v(5,12));
add(v(5,8),v(5,2));
add(v(5,-2),v(5,-12));
add(v(5,-16),v(5,-20));

/* DOOR POSITIONS */

doors.push(v(-5,10));
doors.push(v(-5,0));
doors.push(v(-5,-14));

doors.push(v(5,10));
doors.push(v(5,0));
doors.push(v(5,-14));

/* ROOM SEPARATORS */

add(v(-30,7),v(-5,7));
add(v(-30,-7),v(-5,-7));

add(v(5,7),v(30,7));
add(v(5,-7),v(30,-7));

/* DOOR GAPS (corridor side) */

/* Top room doors */

add(v(-5,20),v(-5,12));
add(v(-5,8),v(-5,7));
doors.push(v(-5,10));

add(v(5,20),v(5,12));
add(v(5,8),v(5,7));
doors.push(v(5,10));

/* Middle room doors */

add(v(-5,7),v(-5,2));
add(v(-5,-2),v(-5,-7));
doors.push(v(-5,0));

add(v(5,7),v(5,2));
add(v(5,-2),v(5,-7));
doors.push(v(5,0));

/* Bottom room doors */

add(v(-5,-7),v(-5,-12));
add(v(-5,-16),v(-5,-20));
doors.push(v(-5,-14));

add(v(5,-7),v(5,-12));
add(v(5,-16),v(5,-20));
doors.push(v(5,-14));

/* MAIN EXIT */

const exit=v(0,-20);

const exitMesh=new THREE.Mesh(
new THREE.BoxGeometry(8,2,1),
new THREE.MeshBasicMaterial({color:0x00ff00})
);

exitMesh.position.set(exit.x,-19,0);
scene.add(exitMesh);

return {walls,doors,exit};

}