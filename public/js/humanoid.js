import * as THREE from 'three';

// Gemeinsamer Charakter-Baukasten für Spieler und NPCs: Kopf, Torso, Arme und Beine als
// einzelne Teile (statt einer einzelnen Kapsel), mit echtem Lauf-/Sprint-Schwung der Gliedmaßen.
function limb(pivotY, length, radius, color) {
  const group = new THREE.Group();
  group.position.y = pivotY;
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  mesh.position.y = -length / 2 - radius;
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

export function buildHumanoid(scene, { shirtColor = 0x3f6ea5, skinColor = 0xe0b089, pantsColor = 0x2b2f3a } = {}) {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.6, 4, 8),
    new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.65 })
  );
  torso.position.y = 1.05;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 }));
  head.position.y = 1.62;
  head.castShadow = true;

  const leftArm = limb(1.35, 0.55, 0.095, skinColor);
  leftArm.position.x = -0.37;
  const rightArm = limb(1.35, 0.55, 0.095, skinColor);
  rightArm.position.x = 0.37;

  const leftLeg = limb(0.78, 0.68, 0.13, pantsColor);
  leftLeg.position.x = -0.15;
  const rightLeg = limb(0.78, 0.68, 0.13, pantsColor);
  rightLeg.position.x = 0.15;

  group.add(torso, head, leftArm, rightArm, leftLeg, rightLeg);
  scene.add(group);

  return {
    group, torso, head, leftArm, rightArm, leftLeg, rightLeg,
    baseY: { torso: 1.05, head: 1.62, leftArm: leftArm.position.y, rightArm: rightArm.position.y, leftLeg: leftLeg.position.y, rightLeg: rightLeg.position.y },
  };
}

// animName: idle | walk | run | crouch | jump | swim
export function applyHumanoidPose(h, animName, animTime, crouching) {
  const crouchDrop = crouching ? 0.28 : 0;
  const isMoving = animName === 'walk' || animName === 'run';
  const freq = animName === 'run' ? 9.5 : 6.2;
  const swing = isMoving ? Math.sin(animTime * freq) : 0;
  const swingAmount = animName === 'run' ? 0.9 : 0.55;

  h.torso.position.y = h.baseY.torso - crouchDrop;
  h.head.position.y = h.baseY.head - crouchDrop;
  h.torso.rotation.x = crouching ? 0.25 : 0;

  if (animName === 'jump') {
    h.leftArm.rotation.x = -0.6; h.rightArm.rotation.x = -0.6;
    h.leftLeg.rotation.x = 0.3; h.rightLeg.rotation.x = -0.2;
  } else if (animName === 'swim') {
    const s = Math.sin(animTime * 5);
    h.leftArm.rotation.x = s * 1.1; h.rightArm.rotation.x = -s * 1.1;
    h.leftLeg.rotation.x = -s * 0.6; h.rightLeg.rotation.x = s * 0.6;
  } else {
    h.leftArm.rotation.x = swing * swingAmount;
    h.rightArm.rotation.x = -swing * swingAmount;
    h.leftLeg.rotation.x = -swing * swingAmount;
    h.rightLeg.rotation.x = swing * swingAmount;
  }

  h.leftArm.position.y = h.baseY.leftArm - crouchDrop;
  h.rightArm.position.y = h.baseY.rightArm - crouchDrop;
  h.leftLeg.position.y = h.baseY.leftLeg - crouchDrop;
  h.rightLeg.position.y = h.baseY.rightLeg - crouchDrop;
}
