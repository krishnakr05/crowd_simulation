import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

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

    // Slight speed variation between agents (realistic human spread)
    this.desiredSpeed = 0.07 + Math.random() * 0.03;

    // Relaxation time — how gradually agent accelerates (higher = smoother)
    this.tau = 1.0;

    // Navigation state — tracked per agent so FlowField can sequence waypoints
    this.navState = {};

    this.evacuated = false;

    this.mesh = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.mesh.position.set(this.position.x, this.position.y, 0);
  }

  update(agents, walls, flowField, emergency) {
    if (this.evacuated) return;

    let force = new THREE.Vector2();

    /* ── IDLE DRIFT ─────────────────────────────────────────────────── */
    if (!emergency) {
      force.add(new THREE.Vector2(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003
      ));
      this.velocity.multiplyScalar(0.9);
    }

    /* ── GOAL FORCE ─────────────────────────────────────────────────── */
    // Uses Social Force Model: f = (v_desired − v) / tau
    if (emergency && flowField) {
      const dir = flowField.getForce(this.position, this.navState);
      const desiredVel = dir.multiplyScalar(this.desiredSpeed);
      const goalForce = desiredVel.sub(this.velocity).multiplyScalar(1 / this.tau);
      force.add(goalForce);
    }

    /* ── AGENT REPULSION ────────────────────────────────────────────── */
    agents.forEach((other) => {
      if (other === this || other.evacuated) return;
      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();
      const minDist = this.radius + other.radius;

      if (dist < minDist * 3.5 && dist > 0.01) {
        const overlap = minDist - dist;
        // Hard contact push vs soft proximity nudge
        const strength = overlap > 0
          ? 0.12 + overlap * 0.35
          : 0.012 * Math.exp(-dist / (minDist * 1.8));
        force.add(diff.normalize().multiplyScalar(strength));
      }
    });

    /* ── WALL REPULSION ─────────────────────────────────────────────── */
    // Reduced range so wall repulsion doesn't fight agents crossing door gaps
    walls.forEach((w) => {
      const closest = w.closestPoint(this.position);
      const diff = this.position.clone().sub(closest);
      const dist = diff.length();
      // Only apply repulsion when genuinely close — wider range caused jitter
      // at door edges where two wall endpoints are near each other
      if (dist < 1.2 && dist > 0.01) {
        const strength = 0.06 * Math.exp(-dist / 0.5);
        force.add(diff.normalize().multiplyScalar(strength));
      }
    });

    /* ── INTEGRATION ────────────────────────────────────────────────── */
    this.velocity.add(force);
    const maxSpeed = emergency ? this.desiredSpeed * 1.2 : this.desiredSpeed * 0.35;
    this.velocity.clampLength(0, maxSpeed);
    this.position.add(this.velocity);

    /* ── WALL HARD CORRECTION ───────────────────────────────────────── */
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

    /* ── EXIT CHECK ─────────────────────────────────────────────────── */
    if (emergency && this.position.distanceTo(this.exit) < 3) {
      this.evacuated = true;
      this.mesh.visible = false;
      this.position.set(9999, 9999);
      this.velocity.set(0, 0);
    }

    /* ── RENDER ─────────────────────────────────────────────────────── */
    this.mesh.position.set(this.position.x, this.position.y, 0);
  }
}
