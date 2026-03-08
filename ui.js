/**
 * ui.js — Layout switcher side panel.
 * Calls switchLayout() exported from main.js.
 * Your teammate can extend this file for Phase 3 interactivity features.
 */

import { switchLayout } from "./main.js";

const panel = document.createElement("div");
panel.style.cssText = `
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  background: rgba(6, 14, 24, 0.92);
  border-left: 1px solid #1a2a3a;
  border-top: 1px solid #1a2a3a;
  border-bottom: 1px solid #1a2a3a;
  border-radius: 8px 0 0 8px;
  padding: 16px 14px;
  font-family: 'Courier New', monospace;
  color: #00ffcc;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 140px;
`;

panel.innerHTML = `
  <div style="font-size:10px; letter-spacing:0.15em; opacity:0.5; margin-bottom:4px;">
    LAYOUT
  </div>
`;

const layouts = [
  { name: 'symmetric', label: 'Symmetric' },
  { name: 'courtyard', label: 'Courtyard' },
  { name: 'office',    label: 'Office'    },
];

let activeLayout = 'symmetric';

layouts.forEach(({ name, label }) => {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.dataset.layout = name;
  btn.style.cssText = `
    background: ${name === activeLayout ? '#0d2a1a' : 'transparent'};
    border: 1px solid ${name === activeLayout ? '#00ffcc' : '#1a2a3a'};
    color: ${name === activeLayout ? '#00ffcc' : '#4a6a7a'};
    font-family: 'Courier New', monospace;
    font-size: 12px;
    letter-spacing: 0.1em;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
  `;

  btn.addEventListener("mouseenter", () => {
    if (btn.dataset.layout !== activeLayout) {
      btn.style.borderColor = "#00ffcc";
      btn.style.color = "#00ffcc";
    }
  });

  btn.addEventListener("mouseleave", () => {
    if (btn.dataset.layout !== activeLayout) {
      btn.style.borderColor = "#1a2a3a";
      btn.style.color = "#4a6a7a";
    }
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // don't trigger emergency
    if (btn.dataset.layout === activeLayout) return;

    // Update active state styling
    panel.querySelectorAll("button").forEach((b) => {
      b.style.background = "transparent";
      b.style.borderColor = "#1a2a3a";
      b.style.color = "#4a6a7a";
    });
    btn.style.background = "#0d2a1a";
    btn.style.borderColor = "#00ffcc";
    btn.style.color = "#00ffcc";

    activeLayout = btn.dataset.layout;
    switchLayout(activeLayout);
  });

  panel.appendChild(btn);
});

document.body.appendChild(panel);
