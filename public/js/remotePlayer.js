import * as THREE from 'three';

// Sichtbarer anderer Spieler, Position/Blickrichtung kommen vom Server (Multiplayer-Raum),
// weich interpoliert statt hart gesetzt, damit Netzwerk-Ruckler nicht direkt sichtbar werden.
export class RemotePlayer {
  constructor(scene, id) {
    this.id = id;
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9d4edd, roughness: 0.6 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe0b089, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 4, 8), bodyMat);
    body.position.y = 0.85;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), headMat);
    head.position.y = 1.55;
    this.group.add(body, head);
    scene.add(this.group);

    this.target = new THREE.Vector3();
    this.targetYaw = 0;
  }

  setTarget(x, y, z, yaw) {
    this.target.set(x, y, z);
    this.targetYaw = yaw;
  }

  update(dt) {
    const damping = 1 - Math.pow(0.0001, dt);
    this.group.position.lerp(this.target, damping);
    this.group.rotation.y += (this.targetYaw - this.group.rotation.y) * damping;
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}
