import * as THREE from 'three';
import { createVehicleState, stepVehicle } from '../shared/vehicle.js';

let nextId = 1;

export class VehicleView {
  constructor(scene, type, x, z, color = 0xd62828) {
    this.state = createVehicleState(`v${nextId++}`, type, x, z);
    this.type = type;

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.1, metalness: 0.2 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    this.group = new THREE.Group();

    if (type === 'boat') {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 5), bodyMat);
      hull.position.y = 0.3;
      hull.castShadow = true;
      this.group.add(hull);
    } else {
      const isBike = type === 'motorcycle';
      const w = isBike ? 0.6 : 1.9, h = isBike ? 1.1 : 1.3, d = isBike ? 2.0 : 4.3;
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.55, d), bodyMat);
      chassis.position.y = 0.55;
      chassis.castShadow = true;
      this.group.add(chassis);

      if (!isBike) {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.5, d * 0.55), glassMat);
        cabin.position.set(0, 0.95, -0.2);
        cabin.castShadow = true;
        this.group.add(cabin);
      }

      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
      const positions = isBike
        ? [[0, 0.35, 0.85], [0, 0.35, -0.85]]
        : [[w / 2, 0.35, d / 2 - 0.5], [-w / 2, 0.35, d / 2 - 0.5], [w / 2, 0.35, -d / 2 + 0.5], [-w / 2, 0.35, -d / 2 + 0.5]];
      this.wheels = positions.map(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, wy, wz);
        wheel.castShadow = true;
        this.group.add(wheel);
        return wheel;
      });
    }

    this.group.position.set(x, this.state.y, z);
    scene.add(this.group);
  }

  distanceTo(pos) {
    return Math.hypot(this.group.position.x - pos.x, this.group.position.z - pos.z);
  }

  update(input, dt) {
    const hasDriver = !!this.state.driverId;
    let simInput = { throttle: 0, steer: 0, brake: false };
    if (hasDriver) {
      const throttle = (input.pressed('KeyW') ? 1 : 0) - (input.pressed('KeyS') ? 1 : 0);
      const steer = (input.pressed('KeyA') ? 1 : 0) - (input.pressed('KeyD') ? 1 : 0);
      simInput = { throttle, steer, brake: input.pressed('Space') };
    }
    stepVehicle(this.state, simInput, dt);
    this.group.position.set(this.state.x, this.state.y, this.state.z);
    this.group.rotation.y = this.state.yaw;

    if (this.wheels) {
      for (const wheel of this.wheels) wheel.rotation.x += this.state.speed * dt * 1.2;
    }
  }

  get speedKmh() { return Math.abs(this.state.speed) * 3.6; }
}
