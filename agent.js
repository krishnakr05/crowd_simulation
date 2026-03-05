import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

// Color ramp: calm (blue) → moderate (yellow) → stressed (red)
// Input t in [0, 1]
function stressColor(t) {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.5) {
    // blue → yellow
    const s = t * 2;
    return new THREE.Color(s, s, 1 - s);
  } else {
    // yellow → red
    const s = (t - 0.5) * 2;
    return new THREE.Color(1, 1 - s, 0);
  }
}

const TRAIL_LENGTH = 10; // number of trail segments per agent

export default class Agent {
  constructor(position, doors, exit) {
    this.position = position.clone();
    this.doors = doors;
    this.exit = exit;

    this.velocity = new THREE.Vector2(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    );

    this.radius = 0.5;
    this.desiredSpeed = 0.07 + Math.random() * 0.03;
    this.tau = 1.0;
    this.navState = {};
    this.evacuated = false;

    // Stress value 0–1, smoothly updated each frame
    this.stress = 0;

    // Trail: circular buffer of past positions
    this.trailPositions = [];
    this.trailMeshes = [];

    // Agent body mesh
    this.mesh = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius, 10),
      new THREE.MeshBasicMaterial({ color: stressColor(0) })
    );
    this.mesh.position.set(this.position.x, this.position.y, 0);
    this.mesh.renderOrder = 2;

    // Build trail dot meshes (small, semi-transparent)
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const alpha = (i / TRAIL_LENGTH) * 0.35;
      const r = this.radius * (i / TRAIL_LENGTH) * 0.7;
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(r, 0.05), 6),
        new THREE.MeshBasicMaterial({
          color: stressColor(0),
          transparent: true,
          opacity: alpha,
        })
      );
      m.position.set(this.position.x, this.position.y, 0);
      m.renderOrder = 1;
      this.trailMeshes.push(m);
    }
  }

  // Call after construction to add trail meshes to scene
  addToScene(scene) {
    scene.add(this.mesh);
    this.trailMeshes.forEach((m) => scene.add(m));
  }

  update(agents, walls, flowField, emergency) {
    if (this.evacuated) return;

    let force = new THREE.Vector2();

    /* ── IDLE DRIFT ─────────────────────────────────────────────── */
    if (!emergency) {
      force.add(new THREE.Vector2(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003
      ));
      this.velocity.multiplyScalar(0.9);
    }

    /* ── GOAL FORCE ─────────────────────────────────────────────── */
    if (emergency && flowField) {
      const dir = flowField.getForce(this.position, this.navState);
      const desiredVel = dir.multiplyScalar(this.desiredSpeed);
      const goalForce = desiredVel.sub(this.velocity).multiplyScalar(1 / this.tau);
      force.add(goalForce);
    }

    /* ── AGENT REPULSION ─────────────────────────────────────────── */
    let crowdPressure = 0;
    agents.forEach((other) => {
      if (other === this || other.evacuated) return;
      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();
      const minDist = this.radius + other.radius;
      if (dist < minDist * 3.5 && dist > 0.01) {
        const overlap = minDist - dist;
        const strength = overlap > 0
          ? 0.12 + overlap * 0.35
          : 0.012 * Math.exp(-dist / (minDist * 1.8));
        force.add(diff.normalize().multiplyScalar(strength));
        // Accumulate pressure for stress coloring
        crowdPressure += overlap > 0 ? 1.0 : 0.2;
      }
    });

    /* ── WALL REPULSION ──────────────────────────────────────────── */
    walls.forEach((w) => {
      const closest = w.closestPoint(this.position);
      const diff = this.position.clone().sub(closest);
      const dist = diff.length();
      if (dist < 1.2 && dist > 0.01) {
        const strength = 0.06 * Math.exp(-dist / 0.5);
        force.add(diff.normalize().multiplyScalar(strength));
      }
    });

    /* ── INTEGRATION ─────────────────────────────────────────────── */
    this.velocity.add(force);
    const maxSpeed = emergency ? this.desiredSpeed * 1.2 : this.desiredSpeed * 0.35;
    this.velocity.clampLength(0, maxSpeed);
    this.position.add(this.velocity);

    /* ── WALL HARD CORRECTION ────────────────────────────────────── */
    walls.forEach((w) => {
      const closest = w.closestPoint(this.position);
      const diff = this.position.clone().sub(closest);
      const dist = diff.length();
      if (dist < this.radius && dist > 0.001) {
        const normal = diff.normalize();
        this.position = closest.clone().add(normal.multiplyScalar(this.radius + 0.01));
        const vDot = this.velocity.dot(normal);
        if (vDot < 0) this.velocity.sub(normal.multiplyScalar(vDot));
      }
    });

    /* ── EXIT CHECK ──────────────────────────────────────────────── */
    if (emergency && this.position.distanceTo(this.exit) < 3) {
      this.evacuated = true;
      this.mesh.visible = false;
      this.trailMeshes.forEach((m) => (m.visible = false));
      this.position.set(9999, 9999);
      this.velocity.set(0, 0);
      return;
    }

    /* ── STRESS UPDATE ───────────────────────────────────────────── */
    // Speed-based stress: moving fast = more stressed
    const speedRatio = this.velocity.length() / this.desiredSpeed;
    // Crowd-pressure stress: being squished = more stressed
    const pressureStress = Math.min(crowdPressure / 4, 1);
    const targetStress = emergency
      ? Math.min((speedRatio * 0.4 + pressureStress * 0.6), 1)
      : 0;
    // Smooth transition so color doesn't flicker
    this.stress += (targetStress - this.stress) * 0.08;

    const color = stressColor(this.stress);
    this.mesh.material.color.copy(color);

    /* ── TRAIL UPDATE ────────────────────────────────────────────── */
    // Push current position into trail history
    this.trailPositions.unshift(this.position.clone());
    if (this.trailPositions.length > TRAIL_LENGTH) {
      this.trailPositions.pop();
    }

    // Update each trail dot's position, color, and opacity
    for (let i = 0; i < this.trailMeshes.length; i++) {
      const tp = this.trailPositions[i];
      if (tp) {
        this.trailMeshes[i].position.set(tp.x, tp.y, 0);
        this.trailMeshes[i].material.color.copy(color);
        // Older = more faded
        this.trailMeshes[i].material.opacity =
          ((TRAIL_LENGTH - i) / TRAIL_LENGTH) * 0.3 * this.stress;
      }
    }

    /* ── RENDER ──────────────────────────────────────────────────── */
    this.mesh.position.set(this.position.x, this.position.y, 0);
  }
}
