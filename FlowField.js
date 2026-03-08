import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export default class FlowField {
  constructor(exits, doors, rooms, waypoints) {
    this.exits = exits;         // array of { pos: Vector2 }
    this.doors = doors;         // array of Vector2
    this.rooms = rooms;         // room definitions from layout
    this.waypoints = waypoints; // array of Vector2 — corridor-side of each door
    this.blockedExitIndex = -1; // -1 = none blocked
  }

  setBlockedExit(index) {
    this.blockedExitIndex = index;
  }

  getForce(position, state) {
    // Assign door once on first call
    if (state.assignedWaypoint === undefined) {
      state.assignedWaypoint = this._roomAwareDoorIndex(position);
    }

    // Check if agent is in corridor right now
    const inCorridor = this._isInCorridor(position);

    if (state.assignedWaypoint === -1 || inCorridor) {
      // Agent is in corridor — head to nearest open exit
      const exitPos = this._nearestOpenExit(position);
      if (!exitPos) return new THREE.Vector2(); // all exits blocked (shouldn't happen)
      const dir = exitPos.clone().sub(position);
      if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
      return dir.normalize();
    }

    // Agent is in a room — head toward their assigned door waypoint
    const wp = this.waypoints[state.assignedWaypoint];
    const dir = wp.clone().sub(position);
    if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
    return dir.normalize();
  }

  // Pick the nearest exit that isn't blocked
  _nearestOpenExit(position) {
    let best = null;
    let bestDist = Infinity;
    this.exits.forEach((exit, i) => {
      if (i === this.blockedExitIndex) return;
      const d = position.distanceTo(exit.pos);
      if (d < bestDist) { bestDist = d; best = exit.pos; }
    });
    return best;
  }

  // Check if position is inside the corridor/open area
  _isInCorridor(position) {
    for (const room of this.rooms) {
      if (room.inCorridor) {
        // Corridor room — but we need to exclude actual rooms
        continue;
      }
      if (
        position.x >= room.xMin && position.x <= room.xMax &&
        position.y >= room.yMin && position.y <= room.yMax
      ) {
        return false; // inside a room
      }
    }
    return true; // not inside any named room = in corridor
  }

  _roomAwareDoorIndex(position) {
    for (const room of this.rooms) {
      if (room.inCorridor) continue;
      if (
        position.x >= room.xMin && position.x <= room.xMax &&
        position.y >= room.yMin && position.y <= room.yMax
      ) {
        if (room.doorIndices.length === 0) return -1;

        let best = room.doorIndices[0];
        let bestDist = position.distanceTo(this.waypoints[best]);
        for (const idx of room.doorIndices) {
          const d = position.distanceTo(this.waypoints[idx]);
          if (d < bestDist) { bestDist = d; best = idx; }
        }
        return best;
      }
    }
    return this._nearestWaypointIndex(position);
  }

  _nearestWaypointIndex(position) {
    let minDist = Infinity;
    let idx = 0;
    this.waypoints.forEach((wp, i) => {
      const d = position.distanceTo(wp);
      if (d < minDist) { minDist = d; idx = i; }
    });
    return idx;
  }
}
