// Multiplayer-Raum: läuft identisch unter Node (per 'ws', server/index.js) und im Cloudflare
// Durable Object (cloudflare/worker.js) – eine Verbindung ist hier nur ein Objekt mit sendFn(text).
//
// Stand jetzt: Positions-Synchronisation ist client-autoritativ (jeder Client meldet seine eigene
// Position, der Server prüft sie nicht gegen die Spielregeln). Das reicht, damit Spieler sich
// gegenseitig in Echtzeit sehen, ist aber noch kein Schutz gegen Teleport-/Speed-Cheats – das ist
// ein eigener, größerer Schritt (serverseitige Simulation mit public/shared/player.js und
// public/shared/vehicle.js) und folgt in einer späteren Ausbaustufe.

const BROADCAST_HZ = 10;

export class Arena {
  constructor() {
    this.conns = new Map(); // id -> { sendFn, state }
    this.nextId = 1;
    this.timer = setInterval(() => this.broadcast(), 1000 / BROADCAST_HZ);
  }

  connect(sendFn) {
    const id = this.nextId++;
    const conn = { id, sendFn, state: null };
    this.conns.set(id, conn);
    this.send(conn, { t: 'welcome', id });
    return conn;
  }

  send(conn, msg) {
    try { conn.sendFn(JSON.stringify(msg)); } catch { /* Verbindung bereits zu */ }
  }

  message(conn, raw) {
    if (typeof raw !== 'string' || raw.length > 2048) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || msg.t !== 'state') return;
    const { x, y, z, yaw, vehicle } = msg;
    if (![x, y, z, yaw].every((v) => typeof v === 'number' && Number.isFinite(v))) return;
    conn.state = { x, y, z, yaw, vehicle: !!vehicle };
  }

  close(conn) {
    this.conns.delete(conn.id);
  }

  broadcast() {
    const players = [];
    for (const c of this.conns.values()) {
      if (c.state) players.push({ id: c.id, ...c.state });
    }
    if (players.length === 0) return;
    for (const c of this.conns.values()) {
      const others = players.filter((p) => p.id !== c.id);
      this.send(c, { t: 'players', players: others });
    }
  }

  stop() {
    clearInterval(this.timer);
  }
}
