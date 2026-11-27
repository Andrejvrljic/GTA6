import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateBuildings, isOnRoad, groundHeightAt } from '../public/shared/world.js';
import { createPlayerState, stepPlayer, PLAYER } from '../public/shared/player.js';
import { createVehicleState, stepVehicle, VEHICLE_TYPES } from '../public/shared/vehicle.js';

test('Stadtgenerierung ist deterministisch und erzeugt Gebäude und Straßen', () => {
  const a = generateBuildings(42);
  const b = generateBuildings(42);
  assert.ok(a.buildings.length > 0);
  assert.ok(a.roads.length > 0);
  assert.deepEqual(a.buildings[0], b.buildings[0]);
});

test('isOnRoad erkennt das Straßenraster', () => {
  assert.equal(isOnRoad(0, 5), true);
  assert.equal(isOnRoad(20, 20), false);
});

test('Spieler sprintet nur mit Ausdauer und regeneriert danach', () => {
  const state = createPlayerState({ x: 0, y: 0, z: 0 });
  const input = { moveX: 0, moveZ: 1, yaw: 0, jump: false, sprint: true, crouch: false };

  for (let i = 0; i < 300; i++) stepPlayer(state, input, 1 / 60);
  assert.equal(state.stamina, 0);
  assert.equal(state.sprinting, false); // keine Ausdauer mehr -> kein Sprint mehr möglich

  const walkInput = { ...input, sprint: false };
  for (let i = 0; i < 60; i++) stepPlayer(state, walkInput, 1 / 60);
  assert.ok(state.stamina > 0);
});

test('Spieler springt und fällt durch Schwerkraft wieder auf den Boden', () => {
  const state = createPlayerState({ x: 0, y: 0, z: 0 });
  const input = { moveX: 0, moveZ: 0, yaw: 0, jump: true, sprint: false, crouch: false };
  stepPlayer(state, input, 1 / 60);
  assert.ok(state.vy > 0);

  const fallInput = { ...input, jump: false };
  let landed = false;
  for (let i = 0; i < 120; i++) {
    stepPlayer(state, fallInput, 1 / 60);
    if (state.grounded) { landed = true; break; }
  }
  assert.ok(landed);
  assert.equal(state.y, groundHeightAt(0, 0));
});

test('Fahrzeug beschleunigt, bremst und respektiert Höchstgeschwindigkeit', () => {
  const state = createVehicleState('t1', 'car', 0, 0, 0);
  const def = VEHICLE_TYPES.car;

  for (let i = 0; i < 600; i++) stepVehicle(state, { throttle: 1, steer: 0, brake: false }, 1 / 60);
  assert.ok(state.speed <= def.maxSpeed + 0.001);

  const speedBeforeBrake = state.speed;
  stepVehicle(state, { throttle: 0, steer: 0, brake: true }, 1 / 60);
  assert.ok(state.speed < speedBeforeBrake);
});
