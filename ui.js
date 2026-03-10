/**
 * ui.js — Interactivity panel + Layout switcher
 * Controls: agent count, simulation speed, reset, exit block/unblock
 */

import {
  switchLayout,
  resetSimulation,
  triggerEmergency,
  setSpeedMultiplier,
  setTargetAgentCount,
  setBlockedExit,
  getExitCount,
  getBlockedExitIndex,
  isEmergency,
} from "./main.js";

import { createSymmetricLayout, createCourtyardLayout, createOfficeLayout } from "./building.js";

/* ══════════════════════════════════════════════════════════════════
   INJECT GLOBAL STYLES
══════════════════════════════════════════════════════════════════ */
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

  * { box-sizing: border-box; }

  .ctrl-panel {
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    width: 210px;
    background: rgba(4, 10, 18, 0.95);
    border-left: 1px solid #0d2535;
    border-top: 1px solid #0d2535;
    border-bottom: 1px solid #0d2535;
    border-radius: 10px 0 0 10px;
    padding: 16px 14px 18px;
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    color: #00ffcc;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 0;
    backdrop-filter: blur(8px);
    box-shadow: -4px 0 32px rgba(0,255,204,0.04);
  }

  .ctrl-section {
    border-top: 1px solid #0d2535;
    padding-top: 12px;
    margin-top: 12px;
  }
  .ctrl-section:first-child {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .ctrl-label {
    font-size: 9px;
    letter-spacing: 0.2em;
    opacity: 0.4;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  /* Layout buttons */
  .layout-btn {
    background: transparent;
    border: 1px solid #0d2535;
    color: #3a5a6a;
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    padding: 7px 10px;
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    width: 100%;
    margin-bottom: 5px;
  }
  .layout-btn:last-child { margin-bottom: 0; }
  .layout-btn:hover { border-color: #00ffcc; color: #00ffcc; }
  .layout-btn.active {
    background: #061a10;
    border-color: #00ffcc;
    color: #00ffcc;
  }

  /* Slider */
  .ctrl-slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .ctrl-slider-row span {
    font-size: 10px;
    opacity: 0.55;
    min-width: 26px;
    text-align: right;
  }
  .ctrl-slider {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 3px;
    background: #0d2535;
    border-radius: 99px;
    outline: none;
    cursor: pointer;
  }
  .ctrl-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00ffcc;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(0,255,204,0.5);
  }
  .ctrl-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: none;
    border-radius: 50%;
    background: #00ffcc;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(0,255,204,0.5);
  }
  .ctrl-value-label {
    font-size: 11px;
    letter-spacing: 0.08em;
    color: #00ffcc;
    opacity: 0.8;
    margin-top: 2px;
    margin-bottom: 0;
  }

  /* Action buttons */
  .action-btn {
    width: 100%;
    padding: 8px 10px;
    border-radius: 4px;
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid;
    margin-bottom: 6px;
    text-align: center;
  }
  .action-btn:last-child { margin-bottom: 0; }

  .btn-reset {
    background: transparent;
    border-color: #1a3a4a;
    color: #4a8a9a;
  }
  .btn-reset:hover {
    background: #061520;
    border-color: #00aacc;
    color: #00ddff;
  }

  .btn-emergency {
    background: transparent;
    border-color: #3a1010;
    color: #aa4444;
  }
  .btn-emergency:hover, .btn-emergency.active {
    background: #1a0808;
    border-color: #ff4400;
    color: #ff6644;
  }
  .btn-emergency.active {
    animation: pulse-red 1.6s ease-in-out infinite;
  }

  /* Exit toggle buttons */
  .exit-btn {
    width: 100%;
    padding: 7px 10px;
    border-radius: 4px;
    font-family: 'Share Tech Mono', 'Courier New', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid;
    margin-bottom: 5px;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .exit-btn:last-child { margin-bottom: 0; }
  .exit-btn .exit-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .exit-btn.open {
    background: transparent;
    border-color: #0d3020;
    color: #3a8a6a;
  }
  .exit-btn.open .exit-dot { background: #00ff88; box-shadow: 0 0 5px rgba(0,255,136,0.6); }
  .exit-btn.open:hover { border-color: #00ff88; color: #00ff88; }
  .exit-btn.blocked {
    background: #1a0808;
    border-color: #ff4400;
    color: #ff6644;
  }
  .exit-btn.blocked .exit-dot { background: #ff4400; box-shadow: 0 0 5px rgba(255,68,0,0.6); }
  .exit-btn.disabled-exit {
    opacity: 0.3;
    cursor: not-allowed;
    border-color: #0d2535;
    color: #2a3a4a;
    background: transparent;
  }
  .exit-btn.disabled-exit .exit-dot { background: #2a3a4a; }

  .no-emergency-note {
    font-size: 9px;
    letter-spacing: 0.1em;
    opacity: 0.3;
    text-align: center;
    margin-top: 4px;
  }

  @keyframes pulse-red {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,68,0,0); }
    50% { box-shadow: 0 0 0 4px rgba(255,68,0,0.2); }
  }
`;
document.head.appendChild(style);

/* ══════════════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════════════ */
let activeLayout = 'symmetric';
let currentLayoutFn = createSymmetricLayout;
let agentCount = 150;
let speedValue = 1.0;
let exitButtons = [];

const layoutMap = {
  symmetric: createSymmetricLayout,
  courtyard: createCourtyardLayout,
  office:    createOfficeLayout,
};
const exitNames = {
  symmetric: ['Exit Bottom', 'Exit Top'],
  courtyard: ['Exit NW', 'Exit NE', 'Exit SW', 'Exit SE'],
  office:    ['Exit Top-Left', 'Exit Right'],
};

/* ══════════════════════════════════════════════════════════════════
   BUILD PANEL
══════════════════════════════════════════════════════════════════ */
const panel = document.createElement("div");
panel.className = "ctrl-panel";
panel.setAttribute("data-no-emergency", "true");

// ── SECTION: LAYOUT ──────────────────────────────────────────────
const layouts = [
  { name: 'symmetric', label: 'Symmetric' },
  { name: 'courtyard', label: 'Courtyard' },
  { name: 'office',    label: 'Office'    },
];

let layoutSection = document.createElement("div");
layoutSection.className = "ctrl-section";
layoutSection.innerHTML = `<div class="ctrl-label">Layout</div>`;

const layoutBtns = {};
layouts.forEach(({ name, label }) => {
  const btn = document.createElement("button");
  btn.className = "layout-btn" + (name === activeLayout ? " active" : "");
  btn.textContent = label;
  btn.setAttribute("data-no-emergency", "true");
  layoutBtns[name] = btn;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (name === activeLayout) return;
    activeLayout = name;
    currentLayoutFn = layoutMap[name];
    Object.values(layoutBtns).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    setTargetAgentCount(agentCount);
    switchLayout(name);
    refreshExitButtons();
    updateEmergencyBtn();
  });

  layoutSection.appendChild(btn);
});
panel.appendChild(layoutSection);

// ── SECTION: AGENT COUNT ─────────────────────────────────────────
const agentSection = document.createElement("div");
agentSection.className = "ctrl-section";
agentSection.innerHTML = `
  <div class="ctrl-label">Agent Count</div>
  <div class="ctrl-slider-row">
    <span>50</span>
    <input type="range" min="50" max="300" step="10" value="150" class="ctrl-slider" id="agentSlider">
    <span>300</span>
  </div>
  <div class="ctrl-value-label" id="agentValueLabel">150 agents</div>
`;
panel.appendChild(agentSection);

// ── SECTION: SPEED ───────────────────────────────────────────────
const speedSection = document.createElement("div");
speedSection.className = "ctrl-section";
speedSection.innerHTML = `
  <div class="ctrl-label">Sim Speed</div>
  <div class="ctrl-slider-row">
    <span>0.5×</span>
    <input type="range" min="0.5" max="3" step="0.1" value="1" class="ctrl-slider" id="speedSlider">
    <span>3×</span>
  </div>
  <div class="ctrl-value-label" id="speedValueLabel">1.0× speed</div>
`;
panel.appendChild(speedSection);

// ── SECTION: ACTIONS ─────────────────────────────────────────────
const actionSection = document.createElement("div");
actionSection.className = "ctrl-section";
actionSection.innerHTML = `<div class="ctrl-label">Actions</div>`;

const resetBtn = document.createElement("button");
resetBtn.className = "action-btn btn-reset";
resetBtn.textContent = "↺  RESET";
resetBtn.setAttribute("data-no-emergency", "true");
resetBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  setTargetAgentCount(agentCount);
  setSpeedMultiplier(speedValue);
  switchLayout(activeLayout);
  refreshExitButtons();
  updateEmergencyBtn();
});
actionSection.appendChild(resetBtn);

const emergencyBtn = document.createElement("button");
emergencyBtn.className = "action-btn btn-emergency";
emergencyBtn.textContent = "⚠  TRIGGER EMERGENCY";
emergencyBtn.setAttribute("data-no-emergency", "true");
emergencyBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  triggerEmergency();
  updateEmergencyBtn();
  refreshExitButtons();
});
actionSection.appendChild(emergencyBtn);

panel.appendChild(actionSection);

// ── SECTION: EXIT CONTROLS ────────────────────────────────────────
const exitSection = document.createElement("div");
exitSection.className = "ctrl-section";
exitSection.innerHTML = `<div class="ctrl-label">Exit Control</div>`;
const exitBtnContainer = document.createElement("div");
const noEmergencyNote = document.createElement("div");
noEmergencyNote.className = "no-emergency-note";
noEmergencyNote.textContent = "trigger emergency first";
exitSection.appendChild(exitBtnContainer);
exitSection.appendChild(noEmergencyNote);
panel.appendChild(exitSection);

document.body.appendChild(panel);

/* ══════════════════════════════════════════════════════════════════
   WIRE UP SLIDERS
══════════════════════════════════════════════════════════════════ */
const agentSlider = document.getElementById("agentSlider");
const agentValueLabel = document.getElementById("agentValueLabel");
agentSlider.addEventListener("input", (e) => {
  e.stopPropagation();
  agentCount = parseInt(agentSlider.value);
  agentValueLabel.textContent = `${agentCount} agents`;
  setTargetAgentCount(agentCount);
});
agentSlider.addEventListener("click", (e) => e.stopPropagation());

const speedSlider = document.getElementById("speedSlider");
const speedValueLabel = document.getElementById("speedValueLabel");
speedSlider.addEventListener("input", (e) => {
  e.stopPropagation();
  speedValue = parseFloat(speedSlider.value);
  speedValueLabel.textContent = `${speedValue.toFixed(1)}× speed`;
  setSpeedMultiplier(speedValue);
});
speedSlider.addEventListener("click", (e) => e.stopPropagation());

/* ══════════════════════════════════════════════════════════════════
   EXIT BUTTON HELPERS
══════════════════════════════════════════════════════════════════ */
function refreshExitButtons() {
  exitBtnContainer.innerHTML = "";
  exitButtons = [];
  const names = exitNames[activeLayout] || [];
  const count = getExitCount();
  const emerg = isEmergency();
  const blockedIdx = getBlockedExitIndex();

  noEmergencyNote.style.display = emerg ? "none" : "block";

  for (let i = 0; i < Math.max(count, names.length); i++) {
    const label = names[i] || `Exit ${i + 1}`;
    const btn = document.createElement("button");
    btn.className = "exit-btn";
    btn.setAttribute("data-no-emergency", "true");

    const dot = document.createElement("span");
    dot.className = "exit-dot";
    btn.appendChild(dot);

    const txt = document.createTextNode(label);
    btn.appendChild(txt);

    if (!emerg) {
      btn.classList.add("disabled-exit");
    } else if (i === blockedIdx) {
      btn.classList.add("blocked");
    } else {
      btn.classList.add("open");
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isEmergency()) return;
      const curBlocked = getBlockedExitIndex();
      if (i === curBlocked) {
        // Unblock — open all exits
        setBlockedExit(-1);
      } else {
        // Block this exit
        setBlockedExit(i);
      }
      refreshExitButtons();
    });

    exitBtnContainer.appendChild(btn);
    exitButtons.push(btn);
  }
}

function updateEmergencyBtn() {
  if (isEmergency()) {
    emergencyBtn.classList.add("active");
    emergencyBtn.textContent = "⚠  EMERGENCY ACTIVE";
  } else {
    emergencyBtn.classList.remove("active");
    emergencyBtn.textContent = "⚠  TRIGGER EMERGENCY";
  }
}

/* ══════════════════════════════════════════════════════════════════
   LISTEN FOR EMERGENCY EVENT (triggered by click on canvas too)
══════════════════════════════════════════════════════════════════ */
window.addEventListener("emergencyStarted", () => {
  updateEmergencyBtn();
  refreshExitButtons();
});

/* ══════════════════════════════════════════════════════════════════
   PREVENT PANEL CLICKS FROM REACHING CANVAS
══════════════════════════════════════════════════════════════════ */
panel.addEventListener("click", (e) => e.stopPropagation());
panel.addEventListener("mousedown", (e) => e.stopPropagation());

/* ══════════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════════ */
refreshExitButtons();
updateEmergencyBtn();