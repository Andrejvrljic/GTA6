import * as THREE from 'three';

// Third-Person-Kamera mit freier Maus-Orbit-Steuerung und weicher Dämpfung (kein hartes Snapping).
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.35;
    this.distance = 6.5;
    this.minDistance = 2.2;
    this.maxDistance = 14;
    this.currentPos = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();
  }

  handleInput({ dx, dy, wheel }) {
    this.yaw -= dx * 0.0032;
    this.pitch = Math.max(-0.5, Math.min(1.2, this.pitch + dy * 0.0025));
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + wheel * 0.01));
  }

  update(targetPos, dt) {
    const target = targetPos.clone().add(new THREE.Vector3(0, 1.5, 0));
    // Kamera hinter dem Spieler (entgegen der Blickrichtung), sonst liefe "vorwärts" optisch rückwärts.
    const offset = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).multiplyScalar(this.distance);

    const desiredPos = target.clone().add(offset);

    const damping = 1 - Math.pow(0.0001, dt); // frame-rate-unabhängiges Lerp
    this.currentPos.lerp(desiredPos, damping);
    this.currentTarget.lerp(target, damping);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);
  }

  // Blickrichtung (nur Yaw) für Bewegungssteuerung relativ zur Kamera
  getForward() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  getRight() {
    return new THREE.Vector3(Math.sin(this.yaw + Math.PI / 2), 0, Math.cos(this.yaw + Math.PI / 2));
  }
}
