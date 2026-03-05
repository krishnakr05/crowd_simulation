import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export default class Wall{

constructor(a,b){

this.a=a;
this.b=b;

const geometry=new THREE.BufferGeometry().setFromPoints([
new THREE.Vector3(a.x,a.y,0),
new THREE.Vector3(b.x,b.y,0)
]);

const material=new THREE.LineBasicMaterial({
color:0xffffff
});

this.mesh=new THREE.Line(geometry,material);

}

closestPoint(p){

const ab=this.b.clone().sub(this.a);

const t=
(p.clone().sub(this.a)).dot(ab)/
ab.lengthSq();

const clamped=Math.max(0,Math.min(1,t));

return this.a.clone().add(
ab.multiplyScalar(clamped)
);

}
}