import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export default class FlowField {
  constructor(exits, doors, rooms, waypoints, junctions) {
    this.exits = exits;
    this.doors = doors;
    this.rooms = rooms;
    this.waypoints = waypoints;
    this.junctions = junctions || null;
    this.blockedExitIndex = -1;
  }

  setBlockedExit(index) {
    this.blockedExitIndex = index;
  }

  getForce(position, state) {
    if (state.assignedWaypoint === undefined) {
      state.assignedWaypoint = this._roomAwareDoorIndex(position);
    }

    const inCorridor = this._isInCorridor(position);

    if (state.assignedWaypoint === -1 || inCorridor) {
      // If layout has junctions, route through them when in a side strip
      if (this.junctions) {
        const junction = this._neededJunction(position);
        if (junction) {
          const dir = junction.clone().sub(position);
          if (dir.lengthSq() > 0.0001) return dir.normalize();
        }
      }
      const exitPos = this._nearestOpenExit(position);
      if (!exitPos) return new THREE.Vector2();
      const dir = exitPos.clone().sub(position);
      if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
      return dir.normalize();
    }

    const wp = this.waypoints[state.assignedWaypoint];
    const dir = wp.clone().sub(position);
    if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
    return dir.normalize();
  }

  // When agent is in a side corridor strip, return the junction they must
  // pass through before heading to the exit (exit is only reachable via
  // top/bottom corridor, not directly through classroom walls).
  _neededJunction(position) {
    const exitPos = this._nearestOpenExit(position);
    if (!exitPos) return null;

    const inLeftStrip  = position.x < -18;
    const inRightStrip = position.x >  18;
    if (!inLeftStrip && !inRightStrip) return null;

    if (inLeftStrip) {
      const jTop = this.junctions[0]; // (-22,  12)
      const jBot = this.junctions[1]; // (-22, -12)
      const useTop = exitPos.y > 0;
      const j = useTop ? jTop : jBot;
      if (useTop  && position.y >= j.y - 1) return null;
      if (!useTop && position.y <= j.y + 1) return null;
      return j;
    } else {
      const jTop = this.junctions[2]; // ( 22,  12)
      const jBot = this.junctions[3]; // ( 22, -12)
      const useTop = exitPos.y > 0;
      const j = useTop ? jTop : jBot;
      if (useTop  && position.y >= j.y - 1) return null;
      if (!useTop && position.y <= j.y + 1) return null;
      return j;
    }
  }

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

  _isInCorridor(position) {
    for (const room of this.rooms) {
      if (room.inCorridor || room.isBlocked) continue;
      if (
        position.x >= room.xMin && position.x <= room.xMax &&
        position.y >= room.yMin && position.y <= room.yMax
      ) {
        return false;
      }
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