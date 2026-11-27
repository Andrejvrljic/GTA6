// Gemeinsame API-Logik: läuft unveraendert unter Node (server/index.js) und im Cloudflare Worker.
// store ist entweder LocalStore (server/db.js, synchron) oder D1Store (cloudflare/d1.js, asynchron) –
// beide Methoden geben hier konsequent über await zurück, das funktioniert für beide Fälle.

function publicAccount(a) {
  return { money: a.money, x: a.x, y: a.y, z: a.z };
}

export async function handleApi(store, { method, path, body }) {
  if (path === '/api/session' && method === 'POST') {
    const token = typeof body.token === 'string' ? body.token : null;
    let account = token ? await store.getByToken(token) : null;
    let outToken = token;
    if (!account) {
      const created = await store.createAccount();
      account = created.account;
      outToken = created.token;
    }
    return { status: 200, data: { token: outToken, ...publicAccount(account) } };
  }

  if (path === '/api/save' && method === 'POST') {
    const { token, money, x, y, z } = body;
    if (typeof token !== 'string' || [money, x, y, z].some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
      return { status: 400, data: { error: 'Ungültige Anfrage.' } };
    }
    const account = await store.saveState(token, { money, x, y, z });
    if (!account) return { status: 401, data: { error: 'Unbekanntes Konto.' } };
    return { status: 200, data: { ok: true } };
  }

  return { status: 404, data: { error: 'Nicht gefunden.' } };
}
