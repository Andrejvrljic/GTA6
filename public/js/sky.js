import * as THREE from 'three';

// Himmelskuppel mit weichem Verlauf (Horizont -> Zenit), per Shader statt Textur,
// damit sie sich beim Tag-Nacht-Wechsel flüssig umfärben kann.
const VERTEX = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAGMENT = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorldPosition;
  void main() {
    float h = normalize(vWorldPosition + offset).y;
    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
  }
`;

export function buildSky(scene) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x3a8ee0) },
      bottomColor: { value: new THREE.Color(0xcfe8ff) },
      offset: { value: 20 },
      exponent: { value: 0.6 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(490, 24, 16), material);
  scene.add(dome);
  return { dome, material };
}

const DAY_TOP = new THREE.Color(0x3a8ee0);
const DAY_BOTTOM = new THREE.Color(0xcfe8ff);
const SUNSET_TOP = new THREE.Color(0x27356b);
const SUNSET_BOTTOM = new THREE.Color(0xff9a5c);
const NIGHT_TOP = new THREE.Color(0x02030a);
const NIGHT_BOTTOM = new THREE.Color(0x0b1430);

export function updateSky(sky, sunHeight) {
  const t = THREE.MathUtils.clamp(sunHeight, -1, 1);
  let top, bottom;
  if (t >= 0) {
    top = SUNSET_TOP.clone().lerp(DAY_TOP, THREE.MathUtils.smoothstep(t, 0, 0.35));
    bottom = SUNSET_BOTTOM.clone().lerp(DAY_BOTTOM, THREE.MathUtils.smoothstep(t, 0, 0.35));
  } else {
    top = SUNSET_TOP.clone().lerp(NIGHT_TOP, THREE.MathUtils.smoothstep(-t, 0, 0.3));
    bottom = SUNSET_BOTTOM.clone().lerp(NIGHT_BOTTOM, THREE.MathUtils.smoothstep(-t, 0, 0.3));
  }
  sky.material.uniforms.topColor.value.copy(top);
  sky.material.uniforms.bottomColor.value.copy(bottom);
  return bottom;
}
