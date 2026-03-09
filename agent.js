import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

// Color ramp: calm (blue) → moderate (yellow) → stressed (red)
function stressColor(t) {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.5) {
    const s = t * 2;
    return new THREE.Color(s, s, 1 - s);
  } else {
    const s = (t - 0.5) * 2;
    return new THREE.Color(1, 1 - s, 0);
  }
}

const TRAIL_LENGTH = 10;

export default class Agent {
  constructor(position, doors, exits) {
    this.position = position.clone();
    this.doors = doors;
    // exits can be a single Vector2 (legacy) or array of {pos} objects
    this.exits = Array.isArray(exits)
      ? exits.map(e => e.pos ? e.pos : e)
      : [exits];

    this.radius = 0.5;
    this.desiredSpeed = 0.07 + Math.random() * 0.03;
    this.navState = {};
    this.evacuated = false;
    this.stress = 0;

    // velocity is now only used for trail rendering and stress calculation
    // it is recomputed fresh every frame — never accumulated
    this.velocity = new THREE.Vector2();

    this.trailPositions = [];
    this.trailMeshes = [];

    this.mesh = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius, 10),
      new THREE.MeshBasicMaterial({ color: stressColor(0) })
    );
    this.mesh.position.set(this.position.x, this.position.y, 0);
    this.mesh.renderOrder = 2;

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const r = this.radius * ((TRAIL_LENGTH - i) / TRAIL_LENGTH) * 0.7;
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(Math.max(r, 0.05), 6),
        new THREE.MeshBasicMaterial({
          color: stressColor(0),
          transparent: true,
          opacity: 0,
        })
      );
      m.position.set(this.position.x, this.position.y, 0);
      m.renderOrder = 1;
      this.trailMeshes.push(m);
    }
  }

  addToScene(scene) {
    scene.add(this.mesh);
    this.trailMeshes.forEach((m) => scene.add(m));
  }

  update(agents, walls, flowField, emergency) {
    if (this.evacuated) return;

    const prevPosition = this.position.clone();

    /* ── STEP 1: COMPUTE DESIRED MOVE DIRECTION ─────────────────────
     * Start with a clean desired direction each frame.
     * No velocity history. No accumulation. Purely kinematic.
     * ─────────────────────────────────────────────────────────────── */
    let moveDir = new THREE.Vector2();

    if (!emergency) {
      // Idle: tiny random drift
      moveDir.add(new THREE.Vector2(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      ));
    } else if (flowField) {
      // Emergency: move toward goal
      const goalDir = flowField.getForce(this.position, this.navState);
      moveDir.add(goalDir);
    }

    /* ── STEP 2: WALL AVOIDANCE ──────────────────────────────────────
     * Steer away from walls by adjusting the move direction.
     * This is a steering correction, not a force — it rotates the
     * direction rather than adding an opposing force to velocity.
     * ─────────────────────────────────────────────────────────────── */
    walls.forEach((w) => {
      const closest = w.closestPoint(this.position);
      const diff = this.position.clone().sub(closest);
      const dist = diff.length();
      if (dist < 1.2 && dist > 0.01) {
        const pushStrength = (1.2 - dist) / 1.2;
        moveDir.add(diff.normalize().multiplyScalar(pushStrength * 1.0));
      }
    });

    /* ── STEP 3: NEIGHBOUR AVOIDANCE ─────────────────────────────────
     * Steer laterally around nearby agents.
     * Applied as a direction adjustment, not a force into velocity.
     * ─────────────────────────────────────────────────────────────── */
    let crowdPressure = 0;
    agents.forEach((other) => {
      if (other === this || other.evacuated) return;
      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();
      const minDist = this.radius + other.radius + 0.1;

      if (dist < minDist * 2.5 && dist > 0.01) {
        const overlap = minDist - dist;
        const strength = overlap > 0
          ? overlap * 1.5
          : 0.1 * Math.exp(-dist / minDist);
        moveDir.add(diff.normalize().multiplyScalar(strength));
        crowdPressure += overlap > 0 ? 1.0 : 0.2;
      }
    });

    /* ── STEP 4: NORMALIZE AND SCALE ─────────────────────────────────
     * Normalize the combined direction and scale by desired speed.
     * The direction might not point perfectly at the goal if walls/
     * agents are in the way — that's correct, it means the agent is
     * steering around obstacles. But it will NEVER point backwards
     * because goal direction always dominates in open space.
     * ─────────────────────────────────────────────────────────────── */
    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
    }

    const speed = emergency ? this.desiredSpeed : this.desiredSpeed * 0.3;
    const displacement = moveDir.clone().multiplyScalar(speed);

    /* ── STEP 5: MOVE ────────────────────────────────────────────── */
    this.position.add(displacement);

    /* ── STEP 6: HARD WALL CORRECTION ───────────────────────────── */
    // Snap position out of any wall penetration. Position only, never velocity.
    walls.forEach((w) => {
      const closest = w.closestPoint(this.position);
      const diff = this.position.clone().sub(closest);
      const dist = diff.length();
      if (dist < this.radius && dist > 0.001) {
        this.position = closest.clone().add(diff.normalize().multiplyScalar(this.radius + 0.01));
      }
    });

    /* ── STEP 7: HARD OVERLAP CORRECTION ────────────────────────── */
    // Snap position out of any agent overlap. Position only, never velocity.
    agents.forEach((other) => {
      if (other === this || other.evacuated) return;
      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();
      const minDist = this.radius + other.radius;
      if (dist < minDist && dist > 0.001) {
        const overlap = minDist - dist;
        this.position.add(diff.normalize().multiplyScalar(overlap * 0.5));
      }
    });

    /* ── STEP 8: EXIT CHECK ──────────────────────────────────────── */
    if (emergency) {
      const blockedIdx = flowField ? flowField.blockedExitIndex : -1;
      const nearExit = this.exits.some((e, i) => {
        if (i === blockedIdx) return false;
        return this.position.distanceTo(e) < 3;
      });
      if (nearExit) {
        this.evacuated = true;
        this.mesh.visible = false;
        this.trailMeshes.forEach((m) => (m.visible = false));
        this.position.set(9999, 9999);
        this.velocity.set(0, 0);
        return;
      }
    }

    /* ── STEP 9: UPDATE VELOCITY (for trails/stress only) ────────── */
    // Velocity is derived from actual position change — not integrated.
    // This gives accurate trail direction without any accumulation issues.
    this.velocity = this.position.clone().sub(prevPosition);

    /* ── STRESS UPDATE ───────────────────────────────────────────── */
    const speedRatio = this.velocity.length() / this.desiredSpeed;
    const pressureStress = Math.min(crowdPressure / 4, 1);
    const targetStress = emergency
      ? Math.min(speedRatio * 0.4 + pressureStress * 0.6, 1)
      : 0;
    this.stress += (targetStress - this.stress) * 0.08;

    const color = stressColor(this.stress);
    this.mesh.material.color.copy(color);

    /* ── TRAIL UPDATE ────────────────────────────────────────────── */
    this.trailPositions.unshift(this.position.clone());
    if (this.trailPositions.length > TRAIL_LENGTH) this.trailPositions.pop();

    for (let i = 0; i < this.trailMeshes.length; i++) {
      const tp = this.trailPositions[i];
      if (tp) {
        this.trailMeshes[i].position.set(tp.x, tp.y, 0);
        this.trailMeshes[i].material.color.copy(color);
        this.trailMeshes[i].material.opacity =
          ((TRAIL_LENGTH - i) / TRAIL_LENGTH) * 0.3 * this.stress;
      }
    }

    /* ── RENDER ──────────────────────────────────────────────────── */
    this.mesh.position.set(this.position.x, this.position.y, 0);
  }
}