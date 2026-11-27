const healthFill = document.getElementById('healthFill');
const staminaFill = document.getElementById('staminaFill');
const moneyValue = document.getElementById('moneyValue');
const speedEl = document.getElementById('speed');
const speedValue = document.getElementById('speedValue');
const minimapCanvas = document.getElementById('minimapCanvas');
const mctx = minimapCanvas.getContext('2d');

export function updateHud({ health, stamina, money, inVehicle, speedKmh }) {
  healthFill.style.width = `${Math.max(0, health)}%`;
  staminaFill.style.width = `${Math.max(0, stamina)}%`;
  moneyValue.textContent = Math.floor(money).toLocaleString('de-DE');
  speedEl.classList.toggle('hidden', !inVehicle);
  if (inVehicle) speedValue.textContent = Math.round(speedKmh);
}

// Radar-Minimap: Straßen + NPCs + Spielermarkierung, zentriert auf den Spieler, mit Blickrichtung.
export function drawMinimap(playerX, playerZ, yaw, roads, npcs, vehicles) {
  const RANGE = 90;
  const size = minimapCanvas.width;
  const scale = size / (RANGE * 2);

  mctx.clearRect(0, 0, size, size);
  mctx.fillStyle = '#1a2230';
  mctx.fillRect(0, 0, size, size);

  mctx.save();
  mctx.translate(size / 2, size / 2);
  mctx.rotate(yaw);

  mctx.strokeStyle = '#49566b';
  mctx.lineWidth = 2;
  for (const r of roads) {
    const x1 = (r.x1 - playerX) * scale, z1 = (r.z1 - playerZ) * scale;
    const x2 = (r.x2 - playerX) * scale, z2 = (r.z2 - playerZ) * scale;
    if (Math.max(Math.abs(x1), Math.abs(z1), Math.abs(x2), Math.abs(z2)) > size) continue;
    mctx.beginPath();
    mctx.moveTo(x1, z1);
    mctx.lineTo(x2, z2);
    mctx.stroke();
  }

  mctx.fillStyle = '#f2b134';
  for (const n of npcs) {
    const x = (n.group.position.x - playerX) * scale;
    const z = (n.group.position.z - playerZ) * scale;
    if (Math.abs(x) > size / 2 || Math.abs(z) > size / 2) continue;
    mctx.fillRect(x - 2, z - 2, 4, 4);
  }

  mctx.fillStyle = '#5bc0eb';
  for (const v of vehicles) {
    const x = (v.group.position.x - playerX) * scale;
    const z = (v.group.position.z - playerZ) * scale;
    if (Math.abs(x) > size / 2 || Math.abs(z) > size / 2) continue;
    mctx.fillRect(x - 3, z - 3, 6, 6);
  }

  mctx.restore();

  // Spielermarke immer mittig und oben (Blickrichtung zeigt nach oben, Welt rotiert stattdessen)
  mctx.fillStyle = '#ffffff';
  mctx.beginPath();
  mctx.moveTo(size / 2, size / 2 - 7);
  mctx.lineTo(size / 2 - 5, size / 2 + 6);
  mctx.lineTo(size / 2 + 5, size / 2 + 6);
  mctx.closePath();
  mctx.fill();
}
