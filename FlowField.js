import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

const ROOMS = [
  { xMin: -30, xMax: -5, yMin:  7, yMax: 20, doorIndices: [0] }, // top-left
  { xMin: -30, xMax: -5, yMin: -7, yMax:  7, doorIndices: [1] }, // mid-left
  { xMin: -30, xMax: -5, yMin:-20, yMax: -7, doorIndices: [2] }, // bot-left
  { xMin:   5, xMax: 30, yMin:  7, yMax: 20, doorIndices: [3] }, // top-right
  { xMin:   5, xMax: 30, yMin: -7, yMax:  7, doorIndices: [4] }, // mid-right
  { xMin:   5, xMax: 30, yMin:-20, yMax: -7, doorIndices: [5] }, // bot-right
  // Corridor — agents already inside just head to exit
  { xMin:  -5, xMax:   5, yMin:-20, yMax: 20, doorIndices: [] },
];

export default class FlowField {
  constructor(exit, doors) {
    this.exit = exit.clone();
    this.doors = doors;

    // Waypoints are placed INSIDE the corridor (past the corridor wall)
    this.waypoints = doors.map((d) => {
      const insideX = d.x < 0 ? -2 : 2;
      return new THREE.Vector2(insideX, d.y);
    });
  }

  getForce(position, state) {
    // Assign waypoint once, based on which room the agent starts in
    if (state.assignedWaypoint === undefined) {
      state.assignedWaypoint = this._roomAwareDoorIndex(position);
      state.throughDoor = false;
    }

    // -1 means agent is in the corridor — go straight to exit
    if (state.assignedWaypoint === -1) {
      state.throughDoor = true;
    }

    // Mark as through-door once agent reaches the waypoint
    if (!state.throughDoor) {
      const wp = this.waypoints[state.assignedWaypoint];
      if (position.distanceTo(wp) < 1.5) {
        state.throughDoor = true;
      }
    }

    const target = state.throughDoor
      ? this.exit
      : this.waypoints[state.assignedWaypoint];

    const dir = target.clone().sub(position);
    if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
    return dir.normalize();
  }

  /**
   * Find which room the agent is in, then return that room's door index.
   * Falls back to nearest waypoint if no room matches (shouldn't happen).
   */
  _roomAwareDoorIndex(position) {
    for (const room of ROOMS) {
      if (
        position.x >= room.xMin && position.x <= room.xMax &&
        position.y >= room.yMin && position.y <= room.yMax
      ) {
        if (room.doorIndices.length === 0) return -1; // in corridor

        // If a room has multiple doors, pick the nearest one within that room
        let best = room.doorIndices[0];
        let bestDist = position.distanceTo(this.waypoints[best]);
        for (const idx of room.doorIndices) {
          const d = position.distanceTo(this.waypoints[idx]);
          if (d < bestDist) { bestDist = d; best = idx; }
        }
        return best;
      }
    }

    // Fallback: plain nearest waypoint (agent may be exactly on a boundary)
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
