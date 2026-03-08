import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

function stressColor(t){
t=Math.max(0,Math.min(1,t));

if(t<0.5){
const s=t*2;
return new THREE.Color(s,s,1-s);
}else{
const s=(t-0.5)*2;
return new THREE.Color(1,1-s,0);
}
}

const TRAIL_LENGTH=10;

export default class Agent{

constructor(position,doors,exit){

this.position=position.clone();
this.doors=doors;
this.exit=exit;

this.outsideTarget=exit.clone().add(new THREE.Vector2(0,-30));

this.velocity=new THREE.Vector2(
(Math.random()-0.5)*0.02,
(Math.random()-0.5)*0.02
);

this.radius=0.5;
this.desiredSpeed=0.07+Math.random()*0.03;

this.tau=1.0;

this.navState={};

this.evacuated=false;
this.crossedDoor=false;

this.stress=0;

this.trailPositions=[];
this.trailMeshes=[];

this.mesh=new THREE.Mesh(
new THREE.CircleGeometry(this.radius,10),
new THREE.MeshBasicMaterial({color:stressColor(0)})
);

this.mesh.position.set(this.position.x,this.position.y,0);

this.mesh.renderOrder=2;

for(let i=0;i<TRAIL_LENGTH;i++){

const alpha=(i/TRAIL_LENGTH)*0.35;
const r=this.radius*(i/TRAIL_LENGTH)*0.7;

const m=new THREE.Mesh(
new THREE.CircleGeometry(Math.max(r,0.05),6),
new THREE.MeshBasicMaterial({
color:stressColor(0),
transparent:true,
opacity:alpha
})
);

m.position.set(this.position.x,this.position.y,0);
m.renderOrder=1;

this.trailMeshes.push(m);

}

}

addToScene(scene){
scene.add(this.mesh);
this.trailMeshes.forEach(m=>scene.add(m));
}

update(agents,walls,flowField,emergency){

if(this.evacuated)return;

let force=new THREE.Vector2();

const distToExit=this.position.distanceTo(this.exit);

/* FLOWFIELD */

if(emergency && !this.crossedDoor){

const dir=flowField.getForce(this.position,this.navState);

if(dir.lengthSq()>0){

const desiredVel=dir.multiplyScalar(this.desiredSpeed);

const goalForce=
desiredVel.sub(this.velocity).multiplyScalar(1/this.tau);

force.add(goalForce);

}

}

/* EXTRA EXIT PULL */

if(emergency && !this.crossedDoor && distToExit<6){

const dir=this.exit.clone().sub(this.position).normalize();

force.add(dir.multiplyScalar(0.3));

}

/* BACKFLOW WHEN BLOCKED */

if(window.exitBlocked && !this.crossedDoor && distToExit<6){

const pushBack=new THREE.Vector2(0,1);

force.add(pushBack.multiplyScalar(0.12));

}

/* AGENT REPULSION */

agents.forEach(other=>{

if(other===this || other.evacuated)return;

const diff=this.position.clone().sub(other.position);

const dist=diff.length();

const minDist=this.radius+other.radius;

if(dist<minDist*3.5 && dist>0.01){

const overlap=minDist-dist;

const strength=
overlap>0?
0.12+overlap*0.35:
0.012*Math.exp(-dist/(minDist*1.8));

force.add(diff.normalize().multiplyScalar(strength));

}

});

/* WALL REPULSION */

walls.forEach(w=>{

const closest=w.closestPoint(this.position);

const diff=this.position.clone().sub(closest);

const dist=diff.length();

if(dist<1.2 && dist>0.01){

const strength=0.06*Math.exp(-dist/0.5);

force.add(diff.normalize().multiplyScalar(strength));

}

});

/* UNSTUCK FORCE (FIXES LAST AGENTS FREEZING) */

if(emergency && !this.crossedDoor && distToExit<12){

if(this.velocity.length()<0.01){

const dir=this.exit.clone().sub(this.position).normalize();

force.add(dir.multiplyScalar(0.5));

}

}

/* INTEGRATION */

this.velocity.add(force);

const maxSpeed =
(emergency ? this.desiredSpeed*1.2 : this.desiredSpeed*0.35);

this.velocity.clampLength(0,maxSpeed);

this.position.add(this.velocity);

/* HARD WALL COLLISION */

walls.forEach(w=>{

const closest=w.closestPoint(this.position);

const diff=this.position.clone().sub(closest);

const dist=diff.length();

if(dist<this.radius){

const normal=diff.normalize();

this.position=closest.clone().add(
normal.multiplyScalar(this.radius+0.01)
);

const vDot=this.velocity.dot(normal);

if(vDot<0){
this.velocity.sub(normal.multiplyScalar(vDot));
}

}

});

/* DOOR CROSS */

if(!this.crossedDoor){

if(!window.exitBlocked && this.position.y<this.exit.y+0.8){

this.crossedDoor=true;

}

}

/* OUTSIDE MOVEMENT */

if(this.crossedDoor){

const dir=this.outsideTarget.clone().sub(this.position);

if(dir.lengthSq()>0.01){

const desiredVel=dir.normalize().multiplyScalar(this.desiredSpeed);

const outsideForce=
desiredVel.sub(this.velocity).multiplyScalar(2/this.tau);

this.velocity.add(outsideForce);

}

}

/* REMOVE OUTSIDE */

if(this.crossedDoor && this.position.y<-50){

this.evacuated=true;

this.mesh.visible=false;
this.trailMeshes.forEach(m=>m.visible=false);

}

/* STRESS */

const speedRatio=this.velocity.length()/this.desiredSpeed;

this.stress+=(speedRatio-this.stress)*0.05;

const color=stressColor(this.stress);

this.mesh.material.color.copy(color);

/* TRAIL */

this.trailPositions.unshift(this.position.clone());

if(this.trailPositions.length>TRAIL_LENGTH)
this.trailPositions.pop();

for(let i=0;i<this.trailMeshes.length;i++){

const tp=this.trailPositions[i];

if(tp){

this.trailMeshes[i].position.set(tp.x,tp.y,0);

this.trailMeshes[i].material.color.copy(color);

this.trailMeshes[i].material.opacity=
((TRAIL_LENGTH-i)/TRAIL_LENGTH)*0.3*this.stress;

}

}

this.mesh.position.set(this.position.x,this.position.y,0);

}

}