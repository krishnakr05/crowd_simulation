import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import { doors } from "./doors.js";

export default class FlowField {

  constructor(exit, doors){
    this.exit = exit.clone();
    this.doors = doors;
  }

  getForce(position){

    let target = this.exit;

    let minDist = Infinity;

    this.doors.forEach(d=>{
      const dist = position.distanceTo(d);

      if(dist < minDist){
        minDist = dist;
        target = d;
      }
    });

    if(minDist < 3){
      target = this.exit;
    }

    const dir = target.clone().sub(position);

    if(dir.lengthSq()==0) return new THREE.Vector2();

    return dir.normalize().multiplyScalar(0.04);
  }
}