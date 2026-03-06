import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const HOLD_FRAMES = 30;
const COOLDOWN = 60;

let holdCounter = 0;
let cooldownCounter = 0;
let triggered = false;

export async function initGestureEmergency(callback){

const vision = await FilesetResolver.forVisionTasks(
"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
);

const handLandmarker = await HandLandmarker.createFromOptions(vision,{
baseOptions:{
modelAssetPath:
"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
},
runningMode:"VIDEO",
numHands:1
});

const video = document.createElement("video");

const stream = await navigator.mediaDevices.getUserMedia({
video:{
width:640,
height:480,
facingMode:"user"
}
});

video.srcObject = stream;
await video.play();

video.style.position="fixed";
video.style.opacity="0";
video.style.pointerEvents="none";
video.width=1;
video.height=1;

document.body.appendChild(video);

let lastVideoTime=-1;

function detect(){

requestAnimationFrame(detect);

if(video.readyState < 2) return;

if(video.currentTime === lastVideoTime) return;
lastVideoTime = video.currentTime;

const results = handLandmarker.detectForVideo(video,performance.now());

if(!results || !results.landmarks || results.landmarks.length===0){

holdCounter = 0;
triggered = false;
return;

}

const lm = results.landmarks[0];

const tips=[8,12,16,20];
const knuckles=[6,10,14,18];

let fingersUp = 0;

for(let i=0;i<4;i++){

if(lm[tips[i]].y < lm[knuckles[i]].y){
fingersUp++;
}

}

const openPalm = fingersUp >= 3;

if(openPalm){

holdCounter++;

console.log("Palm detected:",holdCounter);

if(holdCounter >= HOLD_FRAMES && !triggered && cooldownCounter===0){

console.log("🚨 EMERGENCY TRIGGERED BY GESTURE");

triggered = true;
cooldownCounter = COOLDOWN;

callback();

}

}else{

holdCounter = 0;
triggered = false;

}

if(cooldownCounter > 0){
cooldownCounter--;
}

}

detect();

}