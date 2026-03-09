import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export default class FlowField {
  constructor(exits, doors, rooms, waypoints) {
    this.exits = exits;
    this.doors = doors;
    this.rooms = rooms;
    this.waypoints = waypoints;
    this.blockedExitIndex = -1;
  }

  setBlockedExit(index) {
    this.blockedExitIndex = index;
  }

  /* ─────────────────────────────────────────────────────────────────
     Navigation phases:
       0 — door waypoint: walk through the physical door
       1 — columnPt (±27, ±11): step straight up/down to clear side
           room y-bounds (±10) before moving horizontally. Only used
           for side room agents (|y| < 10 when leaving door).
       2 — approachPt (±29, ±13): above side room bounds, outside x
       3 — exit.pos: evacuation
  ───────────────────────────────────────────────────────────────────*/
  getForce(position, state) {

    if (state.phase === undefined) {
      if (this._isInCorridor(position)) {
        state.phase = 2;
        state.assignedExit = this._nearestOpenExitIndex(position);
      } else {
        state.phase = 0;
        state.assignedWaypoint = this._roomAwareDoorIndex(position);
      }
    }

    // Phase 0: walk to door waypoint
    if (state.phase === 0) {
      const wp = this.waypoints[state.assignedWaypoint];
      if (position.distanceTo(wp) < 2.5) {
        state.assignedExit = this._nearestOpenExitIndex(position);
        const exit = this.exits[state.assignedExit];
        // Only use columnPt if agent is still within side-room y range
        if (exit.columnPt && Math.abs(position.y) <= 10) {
          // Pick the columnPt that matches the exit's y direction
          state.phase = 1;
        } else {
          state.phase = 2;
        }
      } else {
        return wp.clone().sub(position).normalize();
      }
    }

    // Phase 1: step straight up/down to clear side room y bounds
    if (state.phase === 1) {
      const exit = this.exits[state.assignedExit];
      const cp = exit.columnPt;
      if (position.distanceTo(cp) < 2.5) {
        state.phase = 2;
      } else {
        return cp.clone().sub(position).normalize();
      }
    }

    // Phase 2: walk to approachPt
    if (state.phase === 2) {
      const exit = this.exits[state.assignedExit];
      const ap = exit.approachPt;
      if (!ap || position.distanceTo(ap) < 2.5) {
        state.phase = 3;
      } else {
        return ap.clone().sub(position).normalize();
      }
    }

    // Phase 3: walk to exit pos
    const exit = this.exits[state.assignedExit];
    const dir = exit.pos.clone().sub(position);
    if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
    return dir.normalize();
  }

  _nearestOpenExitIndex(position) {
    let best = 0, bestDist = Infinity;
    this.exits.forEach((exit, i) => {
      if (i === this.blockedExitIndex) return;
      const d = position.distanceTo(exit.pos);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  _isInCorridor(position) {
    for (const room of this.rooms) {
      if (room.inCorridor || room.isBlocked) continue;
      if (
        position.x >= room.xMin && position.x <= room.xMax &&
        position.y >= room.yMin && position.y <= room.yMax
      ) return false;
    }
    return true;
  }

  _roomAwareDoorIndex(position) {
    for (const room of this.rooms) {
      if (room.inCorridor || room.isBlocked) continue;
      if (
        position.x >= room.xMin && position.x <= room.xMax &&
        position.y >= room.yMin && position.y <= room.yMax
      ) {
        if (room.doorIndices.length === 0) return 0;
        let best = room.doorIndices[0], bestDist = Infinity;
        for (const idx of room.doorIndices) {
          const d = position.distanceTo(this.waypoints[idx]);
          if (d < bestDist) { bestDist = d; best = idx; }
        }
        return best;
      }
    }
    let minDist = Infinity, idx = 0;
    this.waypoints.forEach((wp, i) => {
      const d = position.distanceTo(wp);
      if (d < minDist) { minDist = d; idx = i; }
    });
    return idx;
  }
}