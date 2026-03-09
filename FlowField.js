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
       0 — follow routeChain: walk through each waypoint index in the
           room's routeChain in order. Supports exit-aware chains via
           routeChainByExit: a map from exit index → chain array.
           Falls back to routeChain (static) if not defined.
       1 — approachPt: safe corridor point near the assigned exit
       2 — exit.pos: evacuation trigger

     routeChainByExit allows a room to specify different waypoint paths
     depending on which exit is assigned. This prevents agents from
     being steered toward the wrong side of the building.
  ───────────────────────────────────────────────────────────────────*/
  getForce(position, state) {

    // Initialise on first call
    if (state.phase === undefined) {
      // Assign exit first so chain selection can use it
      state.assignedExit = this._nearestOpenExitIndex(position);

      if (this._isInCorridor(position)) {
        state.phase = 1;
        state.chainStep = 0;
      } else {
        state.phase = 0;
        state.chainStep = 0;
        const room = this._roomAt(position);
        state.chain = this._buildChain(position, room, state.assignedExit);
      }
    }

    // Phase 0: walk through route chain
    if (state.phase === 0) {
      while (state.chainStep < state.chain.length) {
        const wpIdx = state.chain[state.chainStep];
        const wp = this.waypoints[wpIdx];
        if (position.distanceTo(wp) < 2.5) {
          state.chainStep++;
        } else {
          return wp.clone().sub(position).normalize();
        }
      }
      // Finished chain — re-evaluate nearest open exit from current position
      // (may differ from initial assignment now that agent is in corridor)
      state.assignedExit = this._nearestOpenExitIndex(position);
      state.phase = 1;
    }

    // Phase 1: walk to approachPt
    if (state.phase === 1) {
      const exit = this.exits[state.assignedExit];
      const ap = exit.approachPt;
      if (!ap || position.distanceTo(ap) < 2.5) {
        state.phase = 2;
      } else {
        return ap.clone().sub(position).normalize();
      }
    }

    // Phase 2: walk to exit pos
    const exit = this.exits[state.assignedExit];
    const dir = exit.pos.clone().sub(position);
    if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
    return dir.normalize();
  }

  /* Build the waypoint chain for an agent, taking assigned exit into account.
     Priority: routeChainByExit[exitIdx] > routeChain > [nearestDoorWp] */
  _buildChain(position, room, exitIdx) {
    if (room) {
      // Exit-specific chain takes highest priority
      if (room.routeChainByExit && room.routeChainByExit[exitIdx]) {
        return room.routeChainByExit[exitIdx];
      }
      // Static chain fallback
      if (room.routeChain && room.routeChain.length > 0) {
        return room.routeChain;
      }
      // Last resort: nearest door waypoint
      return [this._nearestWaypointInRoom(position, room)];
    }
    return [this._nearestWaypointIndex(position)];
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
      if (position.x >= room.xMin && position.x <= room.xMax &&
          position.y >= room.yMin && position.y <= room.yMax) return false;
    }
    return true;
  }

  _roomAt(position) {
    for (const room of this.rooms) {
      if (room.inCorridor || room.isBlocked) continue;
      if (position.x >= room.xMin && position.x <= room.xMax &&
          position.y >= room.yMin && position.y <= room.yMax) return room;
    }
    return null;
  }

  _nearestWaypointInRoom(position, room) {
    let best = room.doorIndices[0] ?? 0, bestDist = Infinity;
    for (const idx of (room.doorIndices ?? [])) {
      const d = position.distanceTo(this.waypoints[idx]);
      if (d < bestDist) { bestDist = d; best = idx; }
    }
    return best;
  }

  _nearestWaypointIndex(position) {
    let minDist = Infinity, idx = 0;
    this.waypoints.forEach((wp, i) => {
      const d = position.distanceTo(wp);
      if (d < minDist) { minDist = d; idx = i; }
    });
    return idx;
  }

  // Legacy — kept for courtyard layout compatibility
  _roomAwareDoorIndex(position) {
    const room = this._roomAt(position);
    if (room) return this._nearestWaypointInRoom(position, room);
    return this._nearestWaypointIndex(position);
  }
}