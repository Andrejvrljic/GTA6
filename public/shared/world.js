// Gemeinsame Welt-Definition. Läuft identisch im Browser und später im Server (Durable Object).
// Deterministisch (fester Seed), damit Client und Server exakt dieselbe Stadt kennen.

export const WORLD = {
  size: 1000, // Gesamtgröße der Karte (Meter, -500..500 auf X und Z)
  groundY: 0,
  waterLevel: -0.4,
};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Zonen der Stadt: jede Zone hat eine Fläche (Rechteck) und einen Typ, der bestimmt,
// wie Gebäude/Vegetation darin erzeugt werden.
export const ZONES = [
  { id: 'downtown', type: 'highrise', x: 0, z: 0, w: 260, d: 260 },
  { id: 'harbor', type: 'harbor', x: -420, z: 180, w: 200, d: 220 },
  { id: 'suburbs', type: 'residential', x: 280, z: -40, w: 320, d: 300 },
  { id: 'industrial', type: 'industrial', x: 280, z: 300, w: 260, d: 180 },
  { id: 'beach', type: 'beach', x: -120, z: 380, w: 260, d: 180 },
  { id: 'forest', type: 'forest', x: -380, z: -300, w: 260, d: 240 },
];

function zoneAt(x, z) {
  for (const zone of ZONES) {
    if (Math.abs(x - zone.x) <= zone.w / 2 && Math.abs(z - zone.z) <= zone.d / 2) return zone;
  }
  return null;
}

// Straßenraster: Hauptstraßen alle 40m, Nebenstraßen alle 20m dazwischen.
const BLOCK = 40;
const ROAD_WIDTH = 10;
const HALF = WORLD.size / 2;

export function isOnRoad(x, z) {
  const mx = ((x % BLOCK) + BLOCK) % BLOCK;
  const mz = ((z % BLOCK) + BLOCK) % BLOCK;
  return mx < ROAD_WIDTH || mz < ROAD_WIDTH;
}

export function groundHeightAt(x, z) {
  const zone = zoneAt(x, z);
  if (zone && zone.type === 'harbor') return WORLD.waterLevel - 0.6; // Hafenbecken
  if (zone && zone.type === 'beach') {
    // sanfter Übergang zum Wasser Richtung Norden der Strandzone
    const t = (z - (zone.z - zone.d / 2)) / zone.d;
    return 1.5 - t * 2.5;
  }
  return 0;
}

export function isWaterAt(x, z) {
  return groundHeightAt(x, z) < WORLD.waterLevel;
}

// Erzeugt alle Gebäude der Stadt deterministisch aus einem Seed.
export function generateBuildings(seed = 1337) {
  const rand = mulberry32(seed);
  const buildings = [];
  const roads = [];

  for (let x = -HALF + BLOCK / 2; x < HALF; x += BLOCK) {
    for (let z = -HALF + BLOCK / 2; z < HALF; z += BLOCK) {
      const zone = zoneAt(x, z);
      if (!zone) continue;
      if (zone.type === 'harbor' || zone.type === 'beach') continue; // keine Gebäude im Wasser/Strand
      if (isWaterAt(x, z)) continue;

      const plotSize = BLOCK - ROAD_WIDTH - 2;
      const jitterX = (rand() - 0.5) * 2;
      const jitterZ = (rand() - 0.5) * 2;

      if (zone.type === 'forest') {
        // Bäume statt Gebäude
        const count = 2 + Math.floor(rand() * 3);
        for (let i = 0; i < count; i++) {
          buildings.push({
            kind: 'tree',
            x: x + jitterX + (rand() - 0.5) * plotSize,
            z: z + jitterZ + (rand() - 0.5) * plotSize,
            height: 4 + rand() * 5,
            radius: 0.8 + rand() * 0.6,
          });
        }
        continue;
      }

      let height, kind, color;
      if (zone.type === 'highrise') {
        height = 20 + rand() * 60;
        kind = 'highrise';
        color = 0x4a5568 + Math.floor(rand() * 0x202020);
      } else if (zone.type === 'residential') {
        height = 5 + rand() * 6;
        kind = 'house';
        color = 0xc08552 + Math.floor(rand() * 0x101010);
      } else if (zone.type === 'industrial') {
        height = 6 + rand() * 10;
        kind = 'warehouse';
        color = 0x6b705c;
      } else {
        height = 6 + rand() * 10;
        kind = 'block';
        color = 0x888888;
      }

      buildings.push({
        kind,
        x: x + jitterX,
        z: z + jitterZ,
        width: plotSize * (0.6 + rand() * 0.3),
        depth: plotSize * (0.6 + rand() * 0.3),
        height,
        color,
        enterable: kind === 'house' || kind === 'block',
        id: `${zone.id}_${x}_${z}`,
      });
    }
  }

  // Straßenverlauf als Liniensegmente, für Minimap/AI-Wegpunkte
  for (let x = -HALF; x <= HALF; x += BLOCK) roads.push({ x1: x, z1: -HALF, x2: x, z2: HALF });
  for (let z = -HALF; z <= HALF; z += BLOCK) roads.push({ x1: -HALF, z1: z, x2: HALF, z2: z });

  return { buildings, roads };
}

export function spawnPoint() {
  return { x: 20, y: 1, z: 20 };
}
