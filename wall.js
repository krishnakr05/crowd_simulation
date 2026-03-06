import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export default class Wall {

constructor(start,end){

this.start=start.clone();
this.end=end.clone();

const geometry = new THREE.BufferGeometry().setFromPoints([
new THREE.Vector3(start.x,start.y,0),
new THREE.Vector3(end.x,end.y,0)
]);

const material = new THREE.LineBasicMaterial({
color:0xffffff
});

this.mesh = new THREE.Line(geometry,material);

}

closestPoint(point){

const a=this.start;
const b=this.end;

const ab=b.clone().sub(a);

const t=point.clone().sub(a).dot(ab)/ab.lengthSq();

const clamped=Math.max(0,Math.min(1,t));

return a.clone().add(ab.multiplyScalar(clamped));

}

}