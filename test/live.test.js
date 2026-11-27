// Live-Test gegen die echte, gerade veröffentlichte Cloudflare-Umgebung.
// TEST_URL wird vom Workflow gesetzt (z. B. https://gta6.<sub>.workers.dev).
// Money -1 markiert das angelegte Testkonto, damit der Workflow es danach wieder löschen kann.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_URL;
if (!BASE) {
  test.skip('TEST_URL nicht gesetzt – Live-Test übersprungen (nur für CI gegen die echte Umgebung gedacht)', () => {});
} else {
  test('Datenbank: Konto anlegen, speichern und wieder laden', async () => {
    const session1 = await fetch(`${BASE}/api/session`, { method: 'POST', body: '{}' }).then((r) => r.json());
    assert.ok(session1.token);
    assert.equal(typeof session1.money, 'number');

    const save = await fetch(`${BASE}/api/save`, {
      method: 'POST',
      body: JSON.stringify({ token: session1.token, money: -1, x: 42, y: 1, z: -17 }),
    }).then((r) => r.json());
    assert.equal(save.ok, true);

    const session2 = await fetch(`${BASE}/api/session`, {
      method: 'POST',
      body: JSON.stringify({ token: session1.token }),
    }).then((r) => r.json());
    assert.equal(session2.token, session1.token);
    assert.equal(session2.money, -1);
    assert.equal(session2.x, 42);
    assert.equal(session2.z, -17);
  });

  test('Multiplayer: WebSocket-Raum nimmt Verbindungen an', async () => {
    const wsUrl = BASE.replace(/^http/, 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);
    try {
      const welcome = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Kein "welcome" vom Multiplayer-Raum erhalten')), 8000);
        ws.addEventListener('message', (e) => {
          const msg = JSON.parse(e.data);
          if (msg.t === 'welcome') { clearTimeout(t); resolve(msg); }
        });
        ws.addEventListener('error', (e) => { clearTimeout(t); reject(e); });
      });
      assert.ok(welcome.id);
    } finally {
      // Unabhängig vom Ausgang schließen – sonst hält eine offene Verbindung den
      // Node-Prozess (und damit den CI-Job) endlos am Leben, wenn der Test fehlschlägt.
      ws.close();
    }
  });
}
