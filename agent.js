import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export default class Agent {

  constructor(position){

    this.position = position.clone();

    this.velocity = new THREE.Vector2(
      (Math.random()-0.5)*0.1,
      (Math.random()-0.5)*0.1
    );

    this.mass = 80;
    this.radius = 0.6;

    /* realistic walking speed */
    this.desiredSpeed = 0.9;

    this.mesh = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius,8),
      new THREE.MeshBasicMaterial({color:0xffffff})
    );

    this.mesh.position.set(this.position.x,this.position.y,0);
  }

  update(agents,walls,exit,emergency){

    let force = new THREE.Vector2();

    /* ---------------- IDLE MOVEMENT ---------------- */

    if(!emergency){

      force.add(
        new THREE.Vector2(
          (Math.random()-0.5)*0.02,
          (Math.random()-0.5)*0.02
        )
      );

    }

    /* ---------------- GOAL FORCE ---------------- */

    if(emergency){

      const desiredDir =
        exit.clone().sub(this.position).normalize();

      const desiredVelocity =
        desiredDir.multiplyScalar(this.desiredSpeed);

      const goalForce =
        desiredVelocity.clone()
        .sub(this.velocity)
        .multiplyScalar(2);

      force.add(goalForce);
    }

    /* ---------------- AGENT REPULSION ---------------- */

    agents.forEach(other=>{

      if(other===this) return;

      const diff =
        this.position.clone().sub(other.position);

      const dist = diff.length();

      const minDist =
        this.radius + other.radius;

      if(dist < 3){

        const repulse =
          diff.normalize()
          .multiplyScalar(1/(dist+0.5));

        force.add(repulse);
      }

    });

    /* ---------------- WALL FORCE ---------------- */

    walls.forEach(w=>{

      const closest =
        w.closestPoint(this.position);

      const diff =
        this.position.clone().sub(closest);

      const dist = diff.length();

      if(dist < 1.5){

        const repulse =
          diff.normalize()
          .multiplyScalar(1/(dist+0.3));

        force.add(repulse);
      }

    });

    /* ---------------- INTEGRATION ---------------- */

    const acceleration =
      force.divideScalar(this.mass);

    this.velocity.add(acceleration);

    /* limit speed */

    this.velocity.clampLength(0,1);

    this.position.add(this.velocity);

    /* ---------------- WALL CORRECTION ---------------- */

    walls.forEach(w=>{

      const closest =
        w.closestPoint(this.position);

      const diff =
        this.position.clone().sub(closest);

      const dist = diff.length();

      if(dist < this.radius){

        const normal =
          diff.normalize();

        /* push agent outside wall */

        this.position =
          closest.clone().add(
            normal.multiplyScalar(this.radius)
          );

        /* remove velocity into wall */

        const vDot =
          this.velocity.dot(normal);

        if(vDot < 0){

          this.velocity.sub(
            normal.multiplyScalar(vDot)
          );

        }

      }

    });

    /* ---------------- EXIT PASSAGE ---------------- */

    if(emergency){

      if(this.position.distanceTo(exit) < 2){

        /* allow free movement near exit */

        this.velocity.multiplyScalar(0.7);

      }

    }

    /* ---------------- RENDER ---------------- */

    this.mesh.position.set(
      this.position.x,
      this.position.y,
      0
    );

  }

}