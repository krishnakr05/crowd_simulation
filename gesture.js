import { triggerEmergency } from "./main.js";

const HOLD_FRAMES = 30; // frames gesture must be held (~1 second at 30fps)

// Fingertip and knuckle landmark indices
const FINGERTIPS = [8, 12, 16, 20];
const KNUCKLES   = [6, 10, 14, 18];

let holdCount = 0;
let landmarker = null;
let lastVideoTime = -1;

/* ── STATUS INDICATOR ────────────────────────────────────────────── */
// Small on-screen indicator showing gesture detection state
const gestureStatus = document.createElement("div");
gestureStatus.style.cssText = `
  position: fixed; bottom: 72px; right: 20px;
  font-family: 'Courier New', monospace; font-size: 11px;
  color: #00ffcc; opacity: 0.5; pointer-events: none;
  letter-spacing: 0.1em;
`;
gestureStatus.textContent = "GESTURE: INITIALIZING...";
document.body.appendChild(gestureStatus);

// Progress bar that fills as gesture is held
const gestureBar = document.createElement("div");
gestureBar.style.cssText = `
  position: fixed; bottom: 64px; right: 20px;
  width: 120px; height: 3px;
  background: #112233; border-radius: 99px;
  pointer-events: none;
`;
const gestureBarFill = document.createElement("div");
gestureBarFill.style.cssText = `
  height: 100%; width: 0%; background: #00ffcc;
  border-radius: 99px; transition: width 0.1s;
`;
gestureBar.appendChild(gestureBarFill);
document.body.appendChild(gestureBar);

function setStatus(text, color = "#00ffcc") {
  gestureStatus.textContent = "GESTURE: " + text;
  gestureStatus.style.color = color;
}

/* ── MEDIAPIPE SETUP ─────────────────────────────────────────────── */
async function initGesture() {
  try {
    // Load MediaPipe vision tasks from CDN
    const vision = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm"
    );

    const { HandLandmarker, FilesetResolver } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1, // only need one hand
    });

    // Request webcam
    const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 320, height: 240 } 
});

    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    // Hidden — we only need the stream for detection, not display
    video.style.cssText = "position:fixed; opacity:0; pointer-events:none; width:1px; height:1px;";
    document.body.appendChild(video);

    await new Promise((resolve) => { video.onloadeddata = resolve; });

    setStatus("READY — RAISE PALM");
    detectLoop(video);

  } catch (err) {
    // Graceful fallback — gesture just won't work, click still works
    console.warn("Gesture detection unavailable:", err.message);
    setStatus("UNAVAILABLE", "#ff4444");
    setTimeout(() => { gestureStatus.style.display = "none"; gestureBar.style.display = "none"; }, 3000);
  }
}

/* ── DETECTION LOOP ──────────────────────────────────────────────── */
let frameCount=0;
function detectLoop(video) {
  requestAnimationFrame(() => detectLoop(video));
  frameCount++;
  if (frameCount % 3 !== 0) return;

  // Only process new frames
  if (video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;

  const results = landmarker.detectForVideo(video, performance.now());

  if (!results.landmarks || results.landmarks.length === 0) {
    // No hand detected — reset hold counter
    holdCount = 0;
    gestureBarFill.style.width = "0%";
    setStatus("READY — RAISE PALM");
    return;
  }

  const landmarks = results.landmarks[0]; // first hand

  // Check if all 4 fingers are raised
  const palmRaised = FINGERTIPS.every(
    (tipIdx, i) => landmarks[tipIdx].y < landmarks[KNUCKLES[i]].y
  );

  if (palmRaised) {
    holdCount++;
    const progress = Math.min(holdCount / HOLD_FRAMES, 1);
    gestureBarFill.style.width = (progress * 100) + "%";
    setStatus(`HOLD... ${Math.round(progress * 100)}%`, "#ffcc00");

    if (holdCount >= HOLD_FRAMES) {
      // Gesture confirmed — trigger emergency
      triggerEmergency();
      setStatus("TRIGGERED ✓", "#00ff88");
      gestureBarFill.style.width = "100%";
      // Hide gesture UI after triggering
      setTimeout(() => {
        gestureStatus.style.display = "none";
        gestureBar.style.display = "none";
      }, 1500);
    }
  } else {
    // Hand visible but palm not raised — decay hold count
    holdCount = Math.max(0, holdCount - 2);
    gestureBarFill.style.width = (holdCount / HOLD_FRAMES * 100) + "%";
    setStatus("HAND DETECTED", "#00aaff");
  }
}

/* ── INIT ────────────────────────────────────────────────────────── */
initGesture();