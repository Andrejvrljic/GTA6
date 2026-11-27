import * as THREE from 'three';
import { createVehicleState, stepVehicle } from '../shared/vehicle.js';

let nextId = 1;

export class VehicleView {
  constructor(scene, type, x, z, color = 0xd62828) {
    this.state = createVehicleState(`v${nextId++}`, type, x, z);
    this.type = type;

    // Echter Autolack: Clearcoat-Schicht (wie bei modernen PBR-Lacken) statt simplem Standard-Material.
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.28, metalness: 0.75, clearcoat: 1, clearcoatRoughness: 0.08,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0c1119, roughness: 0.05, metalness: 0.1, transmission: 0.5, transparent: true, opacity: 0.9,
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.15, metalness: 1 });
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2b0, emissiveIntensity: 2.2, roughness: 0.3 });
    const taillightMat = new THREE.MeshStandardMaterial({ color: 0x8c1b1b, emissive: 0xb3171c, emissiveIntensity: 2, roughness: 0.3 });

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

      const bumperGeo = new THREE.BoxGeometry(w * 0.95, h * 0.12, 0.12);
      const frontBumper = new THREE.Mesh(bumperGeo, chromeMat);
      frontBumper.position.set(0, 0.32, d / 2 - 0.05);
      const rearBumper = frontBumper.clone();
      rearBumper.position.z = -d / 2 + 0.05;
      this.group.add(frontBumper, rearBumper);

      const lightW = isBike ? 0.18 : w * 0.28;
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(lightW, 0.14, 0.08), headlightMat);
      const taillight = new THREE.Mesh(new THREE.BoxGeometry(lightW, 0.14, 0.08), taillightMat);
      if (isBike) {
        headlight.position.set(0, 0.75, d / 2 - 0.02);
        taillight.position.set(0, 0.75, -d / 2 + 0.02);
        this.group.add(headlight, taillight);
      } else {
        for (const side of [-1, 1]) {
          const hl = headlight.clone(); hl.position.set(side * w * 0.32, 0.5, d / 2 - 0.02);
          const tl = taillight.clone(); tl.position.set(side * w * 0.32, 0.5, -d / 2 + 0.02);
          this.group.add(hl, tl);
        }
      }

      if (!isBike) {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.5, d * 0.55), glassMat);
        cabin.position.set(0, 0.95, -0.2);
        cabin.castShadow = true;
        this.group.add(cabin);
      }

      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 20);
      const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.32, 10);
      const positions = isBike
        ? [[0, 0.35, 0.85], [0, 0.35, -0.85]]
        : [[w / 2, 0.35, d / 2 - 0.5], [-w / 2, 0.35, d / 2 - 0.5], [w / 2, 0.35, -d / 2 + 0.5], [-w / 2, 0.35, -d / 2 + 0.5]];
      this.wheels = positions.map(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, wy, wz);
        wheel.castShadow = true;
        const hub = new THREE.Mesh(hubGeo, chromeMat);
        hub.rotation.z = Math.PI / 2;
        wheel.add(hub);
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
