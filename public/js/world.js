import * as THREE from 'three';
import { WORLD, ZONES, generateBuildings } from '../shared/world.js';
import { buildFacadeTextures, getAsphaltTexture } from './textures.js';
import { buildSky, updateSky } from './sky.js';

const BUILDING_GEOMETRY_CACHE = new THREE.BoxGeometry(1, 1, 1);

export function buildWorld(scene) {
  const { buildings, roads } = generateBuildings();

  // Boden: feine Rasenfarbe statt reinem Einheitsgrün, etwas raue Oberfläche
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3c4a34, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.size, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Straßen mit echter Asphalt-Textur + Fahrbahnmarkierung statt Einheitsfarbe
  const asphalt = getAsphaltTexture();
  for (const r of roads) {
    const horizontal = r.z1 === r.z2;
    const length = horizontal ? Math.abs(r.x2 - r.x1) : Math.abs(r.z2 - r.z1);
    const tex = asphalt.clone();
    tex.needsUpdate = true;
    tex.repeat.set(horizontal ? length / 10 : 1, horizontal ? 1 : length / 10);
    if (!horizontal) tex.rotation = Math.PI / 2;
    const roadMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(horizontal ? length : 10, horizontal ? 10 : length), roadMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((r.x1 + r.x2) / 2, 0.01, (r.z1 + r.z2) / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Wasser (Hafen + Strand)
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1f5f7a, roughness: 0.12, metalness: 0.6, transparent: true, opacity: 0.88 });
  for (const zone of ZONES) {
    if (zone.type !== 'harbor' && zone.type !== 'beach') continue;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(zone.w, zone.d), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(zone.x, WORLD.waterLevel, zone.z);
    scene.add(water);
  }

  // Gebäude + Bäume: Fassaden bekommen eine Fenster-Textur (nachts beleuchtet) statt Einheitsfarbe
  const enterable = [];
  const trees = [];
  const facadeMaterials = [];
  let seed = 1;

  for (const b of buildings) {
    if (b.kind === 'tree') { trees.push(b); continue; }

    const { map, emissiveMap } = buildFacadeTextures(b.color, seed++, 6, Math.max(4, Math.round(b.height / 4)));
    map.repeat.set(1, 1);
    const mat = new THREE.MeshStandardMaterial({
      map, emissiveMap, emissive: new THREE.Color(0xffcf80), emissiveIntensity: 0,
      roughness: 0.75, metalness: 0.05,
    });
    facadeMaterials.push(mat);

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
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 1 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e5339, roughness: 0.9 });
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

  const sky = buildSky(scene);

  return { buildings, roads, enterable, facadeMaterials, sky };
}

export function buildLighting(scene) {
  const hemi = new THREE.HemisphereLight(0x9fc5ff, 0x3a3a2a, 0.65);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -200;
  sun.shadow.camera.right = 200;
  sun.shadow.camera.top = 200;
  sun.shadow.camera.bottom = -200;
  sun.shadow.bias = -0.0015;
  scene.add(sun);

  return { hemi, sun };
}

// Tag-Nacht-Zyklus: bewegt die Sonne, färbt Himmel/Licht ein und schaltet Fensterbeleuchtung zu.
export function updateDayNight(scene, lights, facadeMaterials, sky, dayTimeSeconds) {
  const DAY_LENGTH = 180; // 3 Minuten = ein voller Tag
  const t = (dayTimeSeconds % DAY_LENGTH) / DAY_LENGTH;
  const angle = t * Math.PI * 2;

  const sunHeight = Math.sin(angle);
  lights.sun.position.set(Math.cos(angle) * 200, Math.max(sunHeight, 0.05) * 200, 100);
  lights.sun.intensity = Math.max(0.05, sunHeight) * 1.6;
  lights.sun.color.setHSL(0.11, 0.6, THREE.MathUtils.lerp(0.55, 0.92, Math.max(0, sunHeight)));

  const skyBottom = updateSky(sky, sunHeight);
  if (scene.fog) scene.fog.color.copy(skyBottom);

  lights.hemi.intensity = 0.15 + Math.max(0, sunHeight) * 0.55;

  const nightFactor = THREE.MathUtils.smoothstep(-sunHeight, -0.05, 0.25);
  for (const mat of facadeMaterials) mat.emissiveIntensity = nightFactor * 1.4;

  return { isNight: sunHeight < 0.08, nightFactor };
}
