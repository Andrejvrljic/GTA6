import * as THREE from 'three';
import { buildWorld, buildLighting, updateDayNight } from './world.js';
import { Input } from './input.js';
import { ThirdPersonCamera } from './camera.js';
import { PlayerView } from './playerView.js';
import { VehicleView } from './vehicleView.js';
import { spawnNpcs } from './npc.js';
import { Weather } from './weather.js';
import { updateHud, drawMinimap } from './ui.js';

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

const scene = new THREE.Scene();
const perspCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  perspCamera.aspect = window.innerWidth / window.innerHeight;
  perspCamera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const { roads, enterable } = buildWorld(scene);
const lights = buildLighting(scene);
const weather = new Weather(scene);

const input = new Input(canvas);
canvas.addEventListener('click', () => canvas.requestPointerLock?.());

const camera = new ThirdPersonCamera(perspCamera);
const player = new PlayerView(scene);

const vehicles = [
  new VehicleView(scene, 'car', 24, 8, 0xd62828),
  new VehicleView(scene, 'car', -40, 24, 0x1d3557),
  new VehicleView(scene, 'motorcycle', 12, -16, 0x2a9d8f),
  new VehicleView(scene, 'boat', -420, 150, 0x457b9d),
];

const npcs = spawnNpcs(scene, 40, roads);

let dayTime = 40; // Start am Vormittag
let activeVehicle = null;

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

const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
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

  const dayState = updateDayNight(scene, lights, dayTime);
  weather.update(dt, activeVehicle ? activeVehicle.group.position : player.group.position);

  const trackedPos = activeVehicle ? activeVehicle.group.position : player.group.position;
  updateHud({
    health: player.state.health,
    stamina: player.state.stamina,
    money: 2500,
    inVehicle: !!activeVehicle,
    speedKmh: activeVehicle ? activeVehicle.speedKmh : 0,
  });
  drawMinimap(trackedPos.x, trackedPos.z, camera.yaw, roads, npcs, vehicles);

  renderer.render(scene, perspCamera);
  requestAnimationFrame(animate);
}

animate();
