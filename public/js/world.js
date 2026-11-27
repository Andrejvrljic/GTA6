import * as THREE from 'three';
import { WORLD, ZONES, generateBuildings } from '../shared/world.js';

const BUILDING_GEOMETRY_CACHE = new THREE.BoxGeometry(1, 1, 1);

export function buildWorld(scene) {
  const { buildings, roads } = generateBuildings();

  // Boden
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.size, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Straßen als dunkle Streifen (einfaches Raster)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 1 });
  for (const r of roads) {
    const horizontal = r.z1 === r.z2;
    const length = horizontal ? Math.abs(r.x2 - r.x1) : Math.abs(r.z2 - r.z1);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(horizontal ? length : 10, horizontal ? 10 : length), roadMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((r.x1 + r.x2) / 2, 0.01, (r.z1 + r.z2) / 2);
    scene.add(mesh);
  }

  // Wasser (Hafen + Strand)
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1f5f7a, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });
  for (const zone of ZONES) {
    if (zone.type !== 'harbor' && zone.type !== 'beach') continue;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(zone.w, zone.d), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(zone.x, WORLD.waterLevel, zone.z);
    scene.add(water);
  }

  // Gebäude + Bäume aus der gemeinsamen Simulation
  const instancedByColor = new Map();
  const enterable = [];
  const trees = [];

  for (const b of buildings) {
    if (b.kind === 'tree') {
      trees.push(b);
      continue;
    }
    const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.8 });
    const mesh = new THREE.Mesh(BUILDING_GEOMETRY_CACHE, mat);
    mesh.scale.set(b.width, b.height, b.depth);
    mesh.position.set(b.x, b.height / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.building = b;
    scene.add(mesh);
    if (b.enterable) enterable.push({ ...b, mesh });
  }

  if (trees.length) {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1, 6);
    const leavesGeo = new THREE.ConeGeometry(1, 2, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e5339 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const leaves = new THREE.InstancedMesh(leavesGeo, leavesMat, trees.length);
    const m = new THREE.Matrix4();
    trees.forEach((t, i) => {
      m.compose(new THREE.Vector3(t.x, t.height * 0.25, t.z), new THREE.Quaternion(), new THREE.Vector3(t.radius, t.height * 0.5, t.radius));
      trunks.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(t.x, t.height * 0.6, t.z), new THREE.Quaternion(), new THREE.Vector3(t.radius * 1.8, t.height * 0.5, t.radius * 1.8));
      leaves.setMatrixAt(i, m);
    });
    trunks.castShadow = true;
    leaves.castShadow = true;
    scene.add(trunks, leaves);
  }

  return { buildings, roads, enterable };
}

export function buildLighting(scene) {
  const hemi = new THREE.HemisphereLight(0x9fc5ff, 0x3a3a2a, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -200;
  sun.shadow.camera.right = 200;
  sun.shadow.camera.top = 200;
  sun.shadow.camera.bottom = -200;
  scene.add(sun);

  return { hemi, sun };
}

// Tag-Nacht-Zyklus: bewegt die Sonne und färbt Himmel/Licht entsprechend ein.
export function updateDayNight(scene, lights, dayTimeSeconds) {
  const DAY_LENGTH = 180; // 3 Minuten = ein voller Tag, damit man den Wechsel im Spiel sieht
  const t = (dayTimeSeconds % DAY_LENGTH) / DAY_LENGTH; // 0..1
  const angle = t * Math.PI * 2;

  const sunHeight = Math.sin(angle);
  lights.sun.position.set(Math.cos(angle) * 200, Math.max(sunHeight, 0.05) * 200, 100);
  lights.sun.intensity = Math.max(0.05, sunHeight) * 1.4;

  const dayColor = new THREE.Color(0x8fd0ff);
  const nightColor = new THREE.Color(0x070b16);
  const skyMix = Math.max(0, sunHeight);
  const sky = nightColor.clone().lerp(dayColor, skyMix);
  scene.background = sky;
  if (scene.fog) scene.fog.color = sky;

  lights.hemi.intensity = 0.2 + skyMix * 0.5;
  return { isNight: sunHeight < 0.08 };
}
