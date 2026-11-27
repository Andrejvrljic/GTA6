// Gemeinsame Spieler-Simulation (Bewegung, Sprint, Sprung, Schwimmen).
// Reine Funktionen auf einfachen Zahlen/Objekten, damit sie unverändert auf Client und Server laufen.
import { groundHeightAt, isWaterAt } from './world.js';

export const PLAYER = {
  walkSpeed: 3.2,
  runSpeed: 7.0,
  crouchSpeed: 1.6,
  swimSpeed: 2.6,
  jumpVelocity: 5.5,
  gravity: -16,
  staminaMax: 100,
  staminaDrain: 22, // pro Sekunde beim Sprinten
  staminaRegen: 14, // pro Sekunde beim Nicht-Sprinten
  healthMax: 100,
};

export function createPlayerState(spawn) {
  return {
    x: spawn.x, y: spawn.y, z: spawn.z,
    vy: 0,
    yaw: 0,
    grounded: true,
    swimming: false,
    crouching: false,
    sprinting: false,
    health: PLAYER.healthMax,
    stamina: PLAYER.staminaMax,
    vehicleId: null,
  };
}

// input: { moveX, moveZ (normalisiert, lokal zur Blickrichtung), yaw, jump, sprint, crouch }
export function stepPlayer(state, input, dt) {
  if (state.vehicleId) return state; // Bewegung läuft dann über das Fahrzeug

  state.yaw = input.yaw;
  state.swimming = isWaterAt(state.x, state.z);
  state.crouching = !!input.crouch && !state.swimming;

  const sprintKeyHeld = !!input.sprint && !state.crouching;
  const moving = input.moveX !== 0 || input.moveZ !== 0;
  state.sprinting = sprintKeyHeld && state.stamina > 0 && moving;

  let speed = PLAYER.walkSpeed;
  if (state.swimming) speed = PLAYER.swimSpeed;
  else if (state.crouching) speed = PLAYER.crouchSpeed;
  else if (state.sprinting) speed = PLAYER.runSpeed;

  // Eingaberichtung ist bereits in Weltkoordinaten (Client/Server rechnen das identisch um)
  const len = Math.hypot(input.moveX, input.moveZ) || 1;
  const dx = (input.moveX / len) * speed * dt;
  const dz = (input.moveZ / len) * speed * dt;
  if (input.moveX !== 0 || input.moveZ !== 0) {
    state.x += dx;
    state.z += dz;
  }

  const ground = groundHeightAt(state.x, state.z);

  if (state.swimming) {
    state.vy = 0;
    state.y = Math.max(ground, -0.2);
    state.grounded = true;
  } else {
    state.vy += PLAYER.gravity * dt;
    state.y += state.vy * dt;
    if (state.y <= ground) {
      state.y = ground;
      state.vy = 0;
      state.grounded = true;
      if (input.jump) {
        state.vy = PLAYER.jumpVelocity;
        state.grounded = false;
      }
    } else {
      state.grounded = false;
    }
  }

  if (state.sprinting) {
    state.stamina = Math.max(0, state.stamina - PLAYER.staminaDrain * dt);
  } else if (!sprintKeyHeld) {
    // Nur regenerieren, wenn Sprint nicht mehr angefordert wird – sonst würde die Ausdauer
    // bei leerem Vorrat und weiterhin gehaltener Sprint-Taste jede Sekunde zwischen 0 und
    // einem Regenerations-Tick hin- und herspringen (sichtbares Flackern der Anzeige).
    state.stamina = Math.min(PLAYER.staminaMax, state.stamina + PLAYER.staminaRegen * dt);
  }

  return state;
}
