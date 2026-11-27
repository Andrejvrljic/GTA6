import * as THREE from 'three';

// Umgebungsreflexion (scene.environment) aus dem aktuellen Himmelsverlauf: macht Lack, Glas und
// Wasser realistisch glänzend/spiegelnd statt matt-einfarbig, ohne pro Frame eine echte
// Spiegelungs-Kamera zu rendern (das Himmelsbild ändert sich nur langsam mit Tag/Nacht).
export class EnvironmentReflection {
  constructor(renderer) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.canvas = document.createElement('canvas');
    this.canvas.width = 4; this.canvas.height = 64;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.mapping = THREE.EquirectangularReflectionMapping;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.current = null;
  }

  update(scene, topColor, bottomColor) {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, `#${topColor.getHexString()}`);
    grad.addColorStop(0.55, `#${bottomColor.getHexString()}`);
    grad.addColorStop(1, `#${bottomColor.clone().multiplyScalar(0.5).getHexString()}`);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture.needsUpdate = true;

    if (this.current) this.current.dispose();
    this.current = this.pmrem.fromEquirectangular(this.texture);
    scene.environment = this.current.texture;
  }

  dispose() {
    this.pmrem.dispose();
    if (this.current) this.current.dispose();
  }
}
