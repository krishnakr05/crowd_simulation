import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

const CORRIDOR_WALL_X = 5; // corridor walls are at x = -5 and x = +5

const ROOMS = [
  { xMin: -30, xMax: -5, yMin:  7, yMax: 20, doorIndices: [0] },
  { xMin: -30, xMax: -5, yMin: -7, yMax:  7, doorIndices: [1] },
  { xMin: -30, xMax: -5, yMin:-20, yMax: -7, doorIndices: [2] },
  { xMin:   5, xMax: 30, yMin:  7, yMax: 20, doorIndices: [3] },
  { xMin:   5, xMax: 30, yMin: -7, yMax:  7, doorIndices: [4] },
  { xMin:   5, xMax: 30, yMin:-20, yMax: -7, doorIndices: [5] },
  { xMin:  -5, xMax:   5, yMin:-20, yMax: 20, doorIndices: [] },
];

export default class FlowField {
  constructor(exit, doors) {
    this.exit = exit.clone();
    this.doors = doors;

    // Waypoints placed inside corridor past the wall
    this.waypoints = doors.map((d) => {
      const insideX = d.x < 0 ? -2 : 2;
      return new THREE.Vector2(insideX, d.y);
    });
  }

  getForce(position, state) {
    // Assign door once on first call
    if (state.assignedWaypoint === undefined) {
      state.assignedWaypoint = this._roomAwareDoorIndex(position);
    }

    // Corridor agents go straight to exit
    if (state.assignedWaypoint === -1) {
      const dir = this.exit.clone().sub(position);
      if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
      return dir.normalize();
    }

    const wp = this.waypoints[state.assignedWaypoint];
    const isLeftDoor = wp.x < 0; // left doors: agent must cross to x > -5
                                  // right doors: agent must cross to x < 5

    // RE-EVALUATE every frame whether agent is in corridor or not.
    // This is the core fix — not a one-time latch but a live position check.
    // An agent is "through the door" only if they are actually on the
    // corridor side of the wall right now.
    const inCorridor = isLeftDoor
      ? position.x > -CORRIDOR_WALL_X      // left room agent: in corridor when x > -5
      : position.x <  CORRIDOR_WALL_X;     // right room agent: in corridor when x < 5

    const target = inCorridor ? this.exit : wp;

    const dir = target.clone().sub(position);
    if (dir.lengthSq() < 0.0001) return new THREE.Vector2();
    return dir.normalize();
  }

  _roomAwareDoorIndex(position) {
    for (const room of ROOMS) {
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