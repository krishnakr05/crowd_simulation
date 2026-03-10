import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

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

    // Keep FULL exit objects (with .pos, .gapXMin, etc.) — needed for gap check
    this.exitObjects = Array.isArray(exits) ? exits : [exits];
    // Also keep plain positions for legacy distance checks
    this.exits = this.exitObjects.map(e => e.pos ? e.pos : e);

    this.radius = 0.5;
    this.desiredSpeed = 0.07 + Math.random() * 0.03;
    this.navState = {};
    this.evacuated = false;
    this.exiting = false;
    this.exitDir = null;
    this.stress = 0;
    this.stuckFrames = 0;

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

  resetNavState() {
    this.navState = {};
    this.stuckFrames = 0;
  }

  // Returns true only if agent is physically inside the exit gap opening
  _inExitGap(exitObj) {
    if (exitObj.gapXMin === undefined) return true; // no gap defined, allow
    return (
      this.position.x >= exitObj.gapXMin && this.position.x <= exitObj.gapXMax &&
      this.position.y >= exitObj.gapYMin && this.position.y <= exitObj.gapYMax
    );
  }

  update(agents, walls, flowField, emergency, speedMultiplier = 1.0) {
    if (this.evacuated) return;

    const prevPosition = this.position.clone();

    if (emergency) {
      const blockedIdx = flowField ? flowField.blockedExitIndex : -1;

      // Already exiting — walk freely until off screen
      if (this.exiting) {
        const speed = this.desiredSpeed * speedMultiplier;
        this.position.add(this.exitDir.clone().multiplyScalar(speed));
        this.mesh.position.set(this.position.x, this.position.y, 0);
        this.trailPositions.unshift(this.position.clone());
        if (this.trailPositions.length > TRAIL_LENGTH) this.trailPositions.pop();
        for (let i = 0; i < this.trailMeshes.length; i++) {
          const tp = this.trailPositions[i];
          if (tp) {
            this.trailMeshes[i].position.set(tp.x, tp.y, 0);
            this.trailMeshes[i].material.opacity =
              ((TRAIL_LENGTH - i) / TRAIL_LENGTH) * 0.15;
          }
        }
        const offScreen =
          this.position.x < -85 || this.position.x > 85 ||
          this.position.y < -60 || this.position.y > 60;
        if (offScreen) {
          this.evacuated = true;
          this.mesh.visible = false;
          this.trailMeshes.forEach((m) => (m.visible = false));
          this.position.set(9999, 9999);
          this.velocity.set(0, 0);
        }
        return;
      }

      // Exit trigger: agent must be in phase 2 AND physically inside the gap
      // opening in the outer wall. The gap is the only place in the wall that
      // has no wall segment — walls physically prevent reaching it from inside rooms.
      if (!this.exiting && this.navState.phase === 2) {
        const assignedIdx = this.navState.assignedExit;
        if (assignedIdx !== undefined && assignedIdx !== blockedIdx) {
          const exitObj = this.exitObjects[assignedIdx];
          const exitPos = this.exits[assignedIdx];
          if (exitPos && this.position.distanceTo(exitPos) < 6 && this._inExitGap(exitObj)) {
            this.exiting = true;
            this.exitDir = this.velocity.clone().normalize();
            if (this.exitDir.lengthSq() < 0.001) {
              this.exitDir = exitPos.clone().sub(this.position).normalize();
            }
            if (this.exitDir.lengthSq() < 0.001) this.exitDir.set(0, 1);
            const lateral = new THREE.Vector2(-this.exitDir.y, this.exitDir.x);
            const spread = (this.desiredSpeed - 0.07) / 0.03;
            this.exitDir.add(lateral.multiplyScalar((spread - 0.5) * 0.8)).normalize();
            return;
          }
        }
      }
    }

    // Normal navigation
    let moveDir = new THREE.Vector2();

    if (!emergency) {
      moveDir.add(new THREE.Vector2(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      ));
    } else if (flowField) {
      const goalDir = flowField.getForce(this.position, this.navState);
      moveDir.add(goalDir);
    }

    walls.forEach((w) => {
      const closest = w.closestPoint(this.position);
      const diff = this.position.clone().sub(closest);
      const dist = diff.length();
      if (dist < 1.2 && dist > 0.01) {
        const pushStrength = (1.2 - dist) / 1.2;
        moveDir.add(diff.normalize().multiplyScalar(pushStrength * 1.0));
      }
    });

    let crowdPressure = 0;
    agents.forEach((other) => {
      if (other === this || other.evacuated || other.exiting) return;
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

    if (moveDir.lengthSq() > 0.0001) moveDir.normalize();

    const speed = (emergency ? this.desiredSpeed : this.desiredSpeed * 0.3) * speedMultiplier;
    this.position.add(moveDir.clone().multiplyScalar(speed));

    // Hard wall correction
    walls.forEach((w) => {
      const closest = w.closestPoint(this.position);
      const diff = this.position.clone().sub(closest);
      const dist = diff.length();
      if (dist < this.radius && dist > 0.001) {
        this.position = closest.clone().add(diff.normalize().multiplyScalar(this.radius + 0.01));
      }
    });

    // Agent overlap correction
    agents.forEach((other) => {
      if (other === this || other.evacuated || other.exiting) return;
      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();
      const minDist = this.radius + other.radius;
      if (dist < minDist && dist > 0.001) {
        const overlap = minDist - dist;
        this.position.add(diff.normalize().multiplyScalar(overlap * 0.5));
      }
    });

    // Hard wall correction again after overlap (overlap can push through walls)
    walls.forEach((w) => {
      const closest = w.closestPoint(this.position);
      const diff = this.position.clone().sub(closest);
      const dist = diff.length();
      if (dist < this.radius && dist > 0.001) {
        this.position = closest.clone().add(diff.normalize().multiplyScalar(this.radius + 0.01));
      }
    });

    this.velocity = this.position.clone().sub(prevPosition);

    /* ── STUCK DETECTION ─────────────────────────────────────────── */
    if (emergency) {
      if (this.velocity.length() < this.desiredSpeed * 0.15) {
        this.stuckFrames++;

        // 20 frames: nudge
        if (this.stuckFrames % 20 === 0) {
          const angle = Math.random() * Math.PI * 2;
          this.position.x += Math.cos(angle) * 0.4;
          this.position.y += Math.sin(angle) * 0.4;
        }

        // 40 frames: jump to phase 1 (corridor nav)
        if (this.stuckFrames === 40 && flowField) {
          this.navState = {
            phase: 1,
            chainStep: 0,
            assignedExit: flowField.nearestOpenExitIndex(this.position),
          };
        }

        // 80 frames: teleport to nearest corridor waypoint — guaranteed inside corridor
        // From corridor, agent walks normally to exit through the door gap
        if (this.stuckFrames === 80 && flowField) {
          const corridorWp = flowField._nearestCorridorWaypoint(this.position);
          if (corridorWp) {
            this.position.set(corridorWp.x, corridorWp.y);
            this.navState = {
              phase: 1,
              chainStep: 0,
              assignedExit: flowField.nearestOpenExitIndex(this.position),
            };
            this.stuckFrames = 0;
          }
        }

      } else {
        this.stuckFrames = 0;
      }
    }

    /* ── VISUALS ─────────────────────────────────────────────────── */
    const speedRatio = this.velocity.length() / this.desiredSpeed;
    const pressureStress = Math.min(crowdPressure / 4, 1);
    const targetStress = emergency
      ? Math.min(speedRatio * 0.4 + pressureStress * 0.6, 1)
      : 0;
    this.stress += (targetStress - this.stress) * 0.08;

    const color = stressColor(this.stress);
    this.mesh.material.color.copy(color);

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

    this.mesh.position.set(this.position.x, this.position.y, 0);
  }
}