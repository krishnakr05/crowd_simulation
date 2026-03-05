import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

import Agent from "./agent.js";
import {createBuilding} from "./building.js";

const scene=new THREE.Scene();

const camera=new THREE.OrthographicCamera(-50,50,30,-30,1,100);
camera.position.z=50;

const renderer=new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);

const {walls,doors,exit}=createBuilding(scene);

const agents=[];

function randomPosition(){

const rooms=[
[-25,10],
[10,10],
[-25,0],
[10,0],
[-25,-10],
[10,-10]
];

const r=rooms[Math.floor(Math.random()*rooms.length)];

return new THREE.Vector2(
r[0]+Math.random()*10,
r[1]+Math.random()*6
);

}

for(let i=0;i<150;i++){

let agent=new Agent(randomPosition(),doors,exit);

agents.push(agent);

scene.add(agent.mesh);

}

let emergency=false;

window.addEventListener("click",()=>{

emergency=true;

});

function animate(){

requestAnimationFrame(animate);

agents.forEach(a=>{

a.update(agents,walls,exit,emergency);

});

renderer.render(scene,camera);

}

animate();