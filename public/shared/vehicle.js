// Gemeinsame Fahrzeug-Simulation: einfaches, aber nachvollziehbares Fahrphysik-Modell
// (Beschleunigung/Bremsen über Längskraft, Lenkung über Gierrate, kein reiner Kraftvektor-Hack).
import { groundHeightAt } from './world.js';

export const VEHICLE_TYPES = {
  car: { maxSpeed: 42, accel: 14, brake: 26, turnRate: 1.9, drag: 0.992, maxHealth: 100 },
  motorcycle: { maxSpeed: 48, accel: 20, brake: 30, turnRate: 2.6, drag: 0.988, maxHealth: 60 },
  boat: { maxSpeed: 26, accel: 8, brake: 12, turnRate: 1.2, drag: 0.985, maxHealth: 80 },
};

export function createVehicleState(id, type, x, z, yaw = 0) {
  const def = VEHICLE_TYPES[type] || VEHICLE_TYPES.car;
  return {
    id, type,
    x, y: groundHeightAt(x, z), z, yaw,
    speed: 0,
    health: def.maxHealth,
    driverId: null,
    stolen: false,
  };
}

// input: { throttle: -1..1, steer: -1..1, brake: bool }
export function stepVehicle(state, input, dt) {
  const def = VEHICLE_TYPES[state.type] || VEHICLE_TYPES.car;

  if (input.brake) {
    const sign = Math.sign(state.speed);
    state.speed -= sign * def.brake * dt;
    if (Math.sign(state.speed) !== sign) state.speed = 0;
  } else {
    state.speed += input.throttle * def.accel * dt;
  }
  state.speed *= def.drag;
  state.speed = Math.max(-def.maxSpeed * 0.5, Math.min(def.maxSpeed, state.speed));

  const steerFactor = Math.max(0.15, 1 - Math.abs(state.speed) / def.maxSpeed * 0.6);
  state.yaw += input.steer * def.turnRate * steerFactor * dt * Math.sign(state.speed || 1);

  state.x += Math.sin(state.yaw) * state.speed * dt;
  state.z += Math.cos(state.yaw) * state.speed * dt;
  state.y = groundHeightAt(state.x, state.z);

  return state;
}

export function damageVehicle(state, amount) {
  state.health = Math.max(0, state.health - amount);
  return state.health <= 0;
}
