import * as THREE from 'three';

// Prozedurale Texturen per Canvas – ohne externe Bilddateien, aber deutlich reicher als
// einfarbige Flächen: Hausfassaden mit Fenstern (nachts beleuchtet), Asphalt mit Fahrbahnmarkierung.

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fassadentextur: Grundfarbe + Fenstergitter. Gibt zusätzlich eine Emissive-Textur zurück,
// in der nur die (zufällig ausgewählten) beleuchteten Fenster hell sind – nachts eingeblendet.
export function buildFacadeTextures(baseColorHex, seed, cols = 8, rows = 14) {
  const w = 256, h = 512;
  const base = document.createElement('canvas'); base.width = w; base.height = h;
  const bctx = base.getContext('2d');
  const emissive = document.createElement('canvas'); emissive.width = w; emissive.height = h;
  const ectx = emissive.getContext('2d');

  const rand = mulberry32(seed);
  const baseColor = new THREE.Color(baseColorHex);
  bctx.fillStyle = `#${baseColor.getHexString()}`;
  bctx.fillRect(0, 0, w, h);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  const cellW = w / cols, cellH = h / rows;
  const winW = cellW * 0.6, winH = cellH * 0.55;
  const darkGlass = baseColor.clone().multiplyScalar(0.35);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW + (cellW - winW) / 2;
      const y = r * cellH + (cellH - winH) / 2;
      const lit = rand() < 0.3;
      bctx.fillStyle = lit ? '#ffdfa0' : `#${darkGlass.getHexString()}`;
      bctx.fillRect(x, y, winW, winH);
      if (lit) {
        ectx.fillStyle = '#ffcf80';
        ectx.fillRect(x, y, winW, winH);
      }
    }
  }

  const baseTex = new THREE.CanvasTexture(base);
  const emissiveTex = new THREE.CanvasTexture(emissive);
  baseTex.colorSpace = THREE.SRGBColorSpace;
  for (const t of [baseTex, emissiveTex]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  }
  return { map: baseTex, emissiveMap: emissiveTex };
}

let asphaltTexture = null;
export function getAsphaltTexture() {
  if (asphaltTexture) return asphaltTexture;

  const size = 256;
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#242729';
  ctx.fillRect(0, 0, size, size);

  const rand = mulberry32(7);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }

  ctx.strokeStyle = 'rgba(235, 220, 160, 0.85)';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 16]);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  asphaltTexture = tex;
  return tex;
}
