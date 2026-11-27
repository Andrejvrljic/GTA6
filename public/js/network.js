import { RemotePlayer } from './remotePlayer.js';

const TOKEN_KEY = 'gta6_token';
const SAVE_INTERVAL = 5000;
const STATE_INTERVAL = 100; // 10x/s

export class Network {
  constructor(scene) {
    this.scene = scene;
    this.token = localStorage.getItem(TOKEN_KEY) || null;
    this.account = null;
    this.ws = null;
    this.remotePlayers = new Map();
    this.lastSave = 0;
    this.lastState = 0;
  }

  async connect() {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        body: JSON.stringify({ token: this.token }),
      });
      this.account = await res.json();
      this.token = this.account.token;
      localStorage.setItem(TOKEN_KEY, this.token);
    } catch (e) {
      console.warn('Konnte keine Verbindung zur Datenbank herstellen, spiele offline weiter.', e);
    }

    try {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      this.ws = new WebSocket(`${proto}://${location.host}/ws`);
      this.ws.addEventListener('message', (e) => this.onMessage(e));
      this.ws.addEventListener('close', () => { this.ws = null; });
    } catch (e) {
      console.warn('Multiplayer-Verbindung fehlgeschlagen, spiele offline weiter.', e);
    }
  }

  onMessage(e) {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.t !== 'players') return;

    const seen = new Set();
    for (const p of msg.players) {
      seen.add(p.id);
      let rp = this.remotePlayers.get(p.id);
      if (!rp) {
        rp = new RemotePlayer(this.scene, p.id);
        this.remotePlayers.set(p.id, rp);
      }
      rp.setTarget(p.x, p.y, p.z, p.yaw);
    }
    for (const [id, rp] of this.remotePlayers) {
      if (!seen.has(id)) { rp.dispose(this.scene); this.remotePlayers.delete(id); }
    }
  }

  update(dt, nowMs, trackedPos, yaw, inVehicle, money) {
    for (const rp of this.remotePlayers.values()) rp.update(dt);

    if (this.ws && this.ws.readyState === WebSocket.OPEN && nowMs - this.lastState > STATE_INTERVAL) {
      this.lastState = nowMs;
      this.ws.send(JSON.stringify({ t: 'state', x: trackedPos.x, y: trackedPos.y, z: trackedPos.z, yaw, vehicle: inVehicle }));
    }

    if (this.token && nowMs - this.lastSave > SAVE_INTERVAL) {
      this.lastSave = nowMs;
      fetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({ token: this.token, money, x: trackedPos.x, y: trackedPos.y, z: trackedPos.z }),
      }).catch(() => {});
    }
  }
}
