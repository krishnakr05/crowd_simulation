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

  getForce(position, state) {
    // Initialise on first call
    if (state.phase === undefined) {
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

    // Always re-check: if currently assigned exit is now blocked, re-route from scratch
    if (state.assignedExit === this.blockedExitIndex) {
      state.assignedExit = this._nearestOpenExitIndex(position);
      // Re-enter phase 0 from current room if in a room, else phase 1
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
      // Chain done — re-pick nearest open exit now that agent is in corridor
      state.assignedExit = this._nearestOpenExitIndex(position);
      state.phase = 1;
    }

    // Phase 1: walk to approachPt
    if (state.phase === 1) {
      const exit = this.exits[state.assignedExit];
      const ap = exit.approachPt || exit.pos;
      if (position.distanceTo(ap) < 2.5) {
        state.phase = 2;
      } else {
        return ap.clone().sub(position).normalize();
      }
    }

    // Phase 2: walk directly to exit pos
    const exit = this.exits[state.assignedExit];
    const dir = exit.pos.clone().sub(position);
    if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
    return dir.normalize();
  }

  _buildChain(position, room, exitIdx) {
    if (room) {
      if (room.routeChainByExit && room.routeChainByExit[exitIdx]) {
        return room.routeChainByExit[exitIdx];
      }
      if (room.routeChain && room.routeChain.length > 0) {
        return room.routeChain;
      }
      return [this._nearestWaypointInRoom(position, room)];
    }
    return [this._nearestWaypointIndex(position)];
  }

  nearestOpenExitIndex(position) {
    return this._nearestOpenExitIndex(position);
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

  // Returns the waypoint position closest to `position` that is in the corridor
  _nearestCorridorWaypoint(position) {
    let best = null, bestDist = Infinity;
    this.waypoints.forEach((wp) => {
      if (!this._isInCorridor(wp)) return;
      const d = position.distanceTo(wp);
      if (d < bestDist) { bestDist = d; best = wp; }
    });
    return best || this.waypoints[0];
  }

  _roomAwareDoorIndex(position) {
    const room = this._roomAt(position);
    if (room) return this._nearestWaypointInRoom(position, room);
    return this._nearestWaypointIndex(position);
  }
}