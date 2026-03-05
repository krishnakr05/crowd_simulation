import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export const mouse = new THREE.Vector2(999, 999);
export let emergency = false;

export function setupInput() {
  window.addEventListener("mousemove", e => {
    mouse.x = (e.clientX / window.innerWidth) * 100 - 50;
    mouse.y = -(e.clientY / window.innerHeight) * 100 + 50;
  });

  window.addEventListener("click", () => {
    emergency = !emergency;
  });
}