import * as THREE from 'three';
import { groundHeightAt } from '../shared/world.js';

const SKIN_COLORS = [0xe0b089, 0xc68642, 0x8d5524, 0xffdbac];
const SHIRT_COLORS = [0xb33951, 0x3a86ff, 0x8338ec, 0xfb5607, 0x2a9d8f];

export class Npc {
  constructor(scene, x, z) {
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)] });
    const headMat = new THREE.MeshStandardMaterial({ color: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)] });

    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), bodyMat);
    this.body.position.y = 0.75;
    this.body.castShadow = true;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), headMat);
    this.head.position.y = 1.35;
    this.head.castShadow = true;
    this.group.add(this.body, this.head);

    this.group.position.set(x, groundHeightAt(x, z), z);
    scene.add(this.group);

    this.home = new THREE.Vector2(x, z);
    this.target = this.pickTarget();
    this.speed = 1.2 + Math.random() * 0.8;
    this.pauseTimer = 0;
    this.walkTime = Math.random() * 10;
  }

  pickTarget() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 14;
    return new THREE.Vector2(this.home.x + Math.cos(angle) * dist, this.home.y + Math.sin(angle) * dist);
  }

  update(dt) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return;
    }

    const pos = this.group.position;
    const dx = this.target.x - pos.x;
    const dz = this.target.y - pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.3) {
      this.target = this.pickTarget();
      this.pauseTimer = 1 + Math.random() * 2.5; // NPC bleibt kurz stehen (Interaktion/Pause im Tagesablauf)
      return;
    }

    const step = Math.min(dist, this.speed * dt);
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;
    pos.y = groundHeightAt(pos.x, pos.z);
    this.group.rotation.y = Math.atan2(dx, dz);

    this.walkTime += dt;
    const bob = Math.sin(this.walkTime * 7) * 0.05;
    this.body.position.y = 0.75 + bob;
    this.head.position.y = 1.35 + bob;
  }
}

export function spawnNpcs(scene, count, aroundRoads) {
  const npcs = [];
  for (let i = 0; i < count; i++) {
    const road = aroundRoads[Math.floor(Math.random() * aroundRoads.length)];
    const t = Math.random();
    const x = road.x1 + (road.x2 - road.x1) * t + (Math.random() - 0.5) * 6;
    const z = road.z1 + (road.z2 - road.z1) * t + (Math.random() - 0.5) * 6;
    npcs.push(new Npc(scene, x, z));
  }
  return npcs;
}
