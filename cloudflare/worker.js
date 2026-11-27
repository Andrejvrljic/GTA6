// Veröffentlicht das Spiel auf Cloudflare – wie ECLIPSE und Brawl Engine:
// Worker (Spielseite + API), Durable Object (Multiplayer-Raum), D1 (Datenbank).
import { handleApi } from '../server/api.js';
import { Arena } from '../server/arena.js';
import { D1Store } from './d1.js';

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export class ArenaDO {
  constructor() {
    this.arena = new Arena();
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Nur WebSocket', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const conn = this.arena.connect((text) => server.send(text));
    server.addEventListener('message', (e) => this.arena.message(conn, typeof e.data === 'string' ? e.data : ''));
    server.addEventListener('close', () => this.arena.close(conn));
    server.addEventListener('error', () => this.arena.close(conn));
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json(200, { ok: true, version: env.VERSION || 'dev' });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      return env.ARENA.get(env.ARENA.idFromName('world')).fetch(request);
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        let body = {};
        if (request.method === 'POST') {
          const text = await request.text();
          if (text.length > 16 * 1024) return json(413, { error: 'Zu groß.' });
          try { body = JSON.parse(text || '{}'); } catch { return json(400, { error: 'Ungültige Anfrage.' }); }
        }
        const r = await handleApi(new D1Store(env.DB), { method: request.method, path: url.pathname, body });
        return json(r.status, r.data);
      } catch (e) {
        console.error(e);
        return json(500, { error: 'Serverfehler' });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
