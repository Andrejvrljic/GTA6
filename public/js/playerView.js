import * as THREE from 'three';
import { createPlayerState, stepPlayer, PLAYER } from '../shared/player.js';
import { spawnPoint } from '../shared/world.js';

// Platzhalter-Charaktermodell (Kapsel + Kopf), bis echte animierte Modelle eingebaut werden.
// Struktur ist bereits auf Animationszustände vorbereitet (idle/walk/run/crouch/jump/swim).
export class PlayerView {
  constructor(scene) {
    this.state = createPlayerState(spawnPoint());
    this.anim = 'idle';
    this.animTime = 0;

    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3f6ea5, roughness: 0.6 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe0b089, roughness: 0.8 });

    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 4, 8), bodyMat);
    this.body.position.y = 0.85;
    this.body.castShadow = true;

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), headMat);
    this.head.position.y = 1.55;
    this.head.castShadow = true;

    this.group.add(this.body, this.head);
    scene.add(this.group);
  }

  get position() { return this.group.position; }

  update(input, camera, dt) {
    const forward = camera.getForward();
    const right = camera.getRight();

    let moveX = 0, moveZ = 0;
    if (input.pressed('KeyW')) { moveX += forward.x; moveZ += forward.z; }
    if (input.pressed('KeyS')) { moveX -= forward.x; moveZ -= forward.z; }
    if (input.pressed('KeyD')) { moveX += right.x; moveZ += right.z; }
    if (input.pressed('KeyA')) { moveX -= right.x; moveZ -= right.z; }

    const simInput = {
      moveX, moveZ,
      yaw: camera.yaw,
      jump: input.pressed('Space'),
      sprint: input.pressed('ShiftLeft') || input.pressed('ShiftRight'),
      crouch: input.pressed('ControlLeft') || input.pressed('ControlRight'),
    };

    stepPlayer(this.state, simInput, dt);

    this.group.position.set(this.state.x, this.state.y, this.state.z);
    if (moveX !== 0 || moveZ !== 0) {
      const targetYaw = Math.atan2(moveX, moveZ);
      this.group.rotation.y = targetYaw;
    }

    const moving = moveX !== 0 || moveZ !== 0;
    this.anim = this.state.swimming ? 'swim'
      : !this.state.grounded ? 'jump'
      : this.state.crouching ? 'crouch'
      : this.state.sprinting ? 'run'
      : moving ? 'walk'
      : 'idle';

    this.animTime += dt;
    const bob = (this.anim === 'walk' || this.anim === 'run') ? Math.sin(this.animTime * (this.anim === 'run' ? 14 : 8)) * 0.06 : 0;
    this.body.position.y = 0.85 - (this.state.crouching ? 0.3 : 0) + bob;
    this.head.position.y = 1.55 - (this.state.crouching ? 0.3 : 0) + bob;
  }
}
