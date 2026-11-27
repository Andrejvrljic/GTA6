import { createPlayerState, stepPlayer } from '../shared/player.js';
import { spawnPoint } from '../shared/world.js';
import { buildHumanoid, applyHumanoidPose } from './humanoid.js';

export class PlayerView {
  constructor(scene) {
    this.state = createPlayerState(spawnPoint());
    this.anim = 'idle';
    this.animTime = 0;

    this.humanoid = buildHumanoid(scene, { shirtColor: 0x3f6ea5, pantsColor: 0x24262e });
    this.group = this.humanoid.group;
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
    applyHumanoidPose(this.humanoid, this.anim, this.animTime, this.state.crouching);
  }
}
