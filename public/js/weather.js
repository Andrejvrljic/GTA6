import * as THREE from 'three';

const KINDS = ['clear', 'clouds', 'rain', 'fog'];

// Einfaches, aber echtes Wettersystem: wechselt periodisch, beeinflusst Nebel/Sicht und zeigt Regen als Partikel.
export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.kind = 'clear';
    this.timer = 20;
    scene.fog = new THREE.Fog(0x8fd0ff, 60, 420);

    const rainGeo = new THREE.BufferGeometry();
    const count = 1500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xaad4ff, size: 0.12, transparent: true, opacity: 0.6 });
    this.rain = new THREE.Points(rainGeo, rainMat);
    this.rain.visible = false;
    scene.add(this.rain);
  }

  update(dt, followPos) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.kind = KINDS[Math.floor(Math.random() * KINDS.length)];
      this.timer = 30 + Math.random() * 40;
    }

    this.rain.visible = this.kind === 'rain';
    if (this.rain.visible) {
      this.rain.position.set(followPos.x, 0, followPos.z);
      const pos = this.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 28;
        if (y < 0) y = 40;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    const baseFar = this.kind === 'fog' ? 90 : this.kind === 'rain' ? 220 : 420;
    this.scene.fog.far += (baseFar - this.scene.fog.far) * Math.min(1, dt * 0.5);
  }
}
