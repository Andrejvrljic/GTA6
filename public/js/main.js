import * as THREE from 'three';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';
import { buildWorld, buildLighting, updateDayNight } from './world.js';
import { Input } from './input.js';
import { ThirdPersonCamera } from './camera.js';
import { PlayerView } from './playerView.js';
import { VehicleView } from './vehicleView.js';
import { spawnNpcs } from './npc.js';
import { Weather } from './weather.js';
import { updateHud, drawMinimap } from './ui.js';
import { Network } from './network.js';

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

const scene = new THREE.Scene();
const perspCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, perspCamera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.6, 0.86);
composer.addPass(bloomPass);

composer.addPass(new OutputPass());

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
  perspCamera.aspect = window.innerWidth / window.innerHeight;
  perspCamera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const { roads, facadeMaterials, sky } = buildWorld(scene);
const lights = buildLighting(scene);
const weather = new Weather(scene);

const input = new Input(canvas);

const camera = new ThirdPersonCamera(perspCamera);
const player = new PlayerView(scene);

const vehicles = [
  new VehicleView(scene, 'car', 24, 8, 0xd62828),
  new VehicleView(scene, 'car', -40, 24, 0x1d3557),
  new VehicleView(scene, 'motorcycle', 12, -16, 0x2a9d8f),
  new VehicleView(scene, 'boat', -420, 150, 0x457b9d),
];

const npcs = spawnNpcs(scene, 40, roads);

const network = new Network(scene);
let money = 2500;
network.connect().then(() => {
  if (!network.account) return;
  money = network.account.money;
  if (network.account.x !== 20 || network.account.z !== 20) {
    player.state.x = network.account.x;
    player.state.y = network.account.y;
    player.state.z = network.account.z;
    player.group.position.set(player.state.x, player.state.y, player.state.z);
  }
});

let dayTime = 40; // Start am Vormittag
let activeVehicle = null;
let gameRunning = false;

function tryEnterExitVehicle() {
  if (activeVehicle) {
    activeVehicle.state.driverId = null;
    player.group.position.set(activeVehicle.group.position.x + 1.5, activeVehicle.group.position.y, activeVehicle.group.position.z);
    player.state.x = player.group.position.x;
    player.state.y = player.group.position.y;
    player.state.z = player.group.position.z;
    player.state.vehicleId = null;
    player.group.visible = true;
    activeVehicle = null;
    return;
  }

  for (const v of vehicles) {
    if (v.distanceTo(player.group.position) < 3.2) {
      activeVehicle = v;
      v.state.driverId = 'player';
      player.state.vehicleId = v.state.id;
      player.group.visible = false;
      return;
    }
  }
}

// --- Start-/Pause-Bildschirm -------------------------------------------------
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const hud = document.getElementById('hud');

function setRunning(running) {
  gameRunning = running;
  hud.classList.toggle('hidden', !running);
  pauseScreen.classList.toggle('hidden', running);
}

document.getElementById('startButton').addEventListener('click', () => {
  startScreen.classList.add('hidden');
  setRunning(true);
  input.requestLock();
});

document.getElementById('resumeButton').addEventListener('click', () => {
  input.requestLock();
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    if (!startScreen.classList.contains('hidden')) return; // Start-Screen regelt das selbst
    setRunning(true);
  } else if (gameRunning) {
    setRunning(false);
  }
});

canvas.addEventListener('click', () => {
  if (!startScreen.classList.contains('hidden')) return;
  if (!gameRunning) input.requestLock();
});

const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(0.05, clock.getDelta());

  if (gameRunning) {
    dayTime += dt;

    const camInput = input.consumeFrame();
    camera.handleInput(camInput);

    if (input.wasJustPressed('KeyE')) tryEnterExitVehicle();

    if (activeVehicle) {
      activeVehicle.update(input, dt);
      camera.update(activeVehicle.group.position, dt);
    } else {
      player.update(input, camera, dt);
      camera.update(player.group.position, dt);
    }

    for (const v of vehicles) if (v !== activeVehicle) v.update(input, dt);
    for (const n of npcs) n.update(dt);

    updateDayNight(scene, lights, facadeMaterials, sky, dayTime);
    weather.update(dt, activeVehicle ? activeVehicle.group.position : player.group.position);

    const trackedPos = activeVehicle ? activeVehicle.group.position : player.group.position;
    updateHud({
      health: player.state.health,
      stamina: player.state.stamina,
      money,
      inVehicle: !!activeVehicle,
      speedKmh: activeVehicle ? activeVehicle.speedKmh : 0,
    });
    drawMinimap(trackedPos.x, trackedPos.z, camera.yaw, roads, npcs, vehicles);
    network.update(dt, performance.now(), trackedPos, camera.yaw, !!activeVehicle, money);
  } else {
    // Im Pause-/Start-Zustand langsam um die Szene schwenken (Hintergrund hinter dem Menü)
    camera.yaw += dt * 0.05;
    camera.update(player.group.position, dt);
    dayTime += dt;
    updateDayNight(scene, lights, facadeMaterials, sky, dayTime);
  }

  composer.render();
  requestAnimationFrame(animate);
}

animate();
