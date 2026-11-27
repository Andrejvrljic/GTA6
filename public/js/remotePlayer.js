import * as THREE from 'three';
import { buildHumanoid, applyHumanoidPose } from './humanoid.js';

// Sichtbarer anderer Spieler, Position/Blickrichtung kommen vom Server (Multiplayer-Raum),
// weich interpoliert statt hart gesetzt, damit Netzwerk-Ruckler nicht direkt sichtbar werden.
export class RemotePlayer {
  constructor(scene, id) {
    this.id = id;
    this.humanoid = buildHumanoid(scene, { shirtColor: 0x9d4edd, pantsColor: 0x24262e });
    this.group = this.humanoid.group;

    this.target = new THREE.Vector3();
    this.targetYaw = 0;
    this.lastPos = new THREE.Vector3();
    this.walkTime = 0;
  }

  setTarget(x, y, z, yaw) {
    this.target.set(x, y, z);
    this.targetYaw = yaw;
  }

  update(dt) {
    const damping = 1 - Math.pow(0.0001, dt);
    this.group.position.lerp(this.target, damping);
    this.group.rotation.y += (this.targetYaw - this.group.rotation.y) * damping;

    const moved = this.group.position.distanceTo(this.lastPos) > 0.01;
    this.lastPos.copy(this.group.position);
    this.walkTime += dt;
    applyHumanoidPose(this.humanoid, moved ? 'walk' : 'idle', this.walkTime, false);
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}
