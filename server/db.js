// Lokale Datenbank für die Entwicklung: SQLite, in Node eingebaut (kein Extra-Programm nötig).
// Gleiche Methoden wie cloudflare/d1.js, damit server/api.js unverändert auf beiden läuft.
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA } from './store-schema.js';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const randomToken = () => crypto.randomBytes(24).toString('hex');

export class LocalStore {
  constructor(file = ':memory:') {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    for (const stmt of SCHEMA) this.db.exec(stmt);
  }

  createAccount() {
    const now = Date.now();
    const token = randomToken();
    const stmt = this.db.prepare('INSERT INTO accounts (token_hash, created, updated) VALUES (?, ?, ?)');
    const r = stmt.run(sha(token), now, now);
    const row = this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(r.lastInsertRowid);
    return { token, account: row };
  }

  getByToken(token) {
    if (typeof token !== 'string' || token.length < 20) return null;
    return this.db.prepare('SELECT * FROM accounts WHERE token_hash = ?').get(sha(token)) || null;
  }

  saveState(token, { money, x, y, z }) {
    const account = this.getByToken(token);
    if (!account) return null;
    this.db.prepare('UPDATE accounts SET money = ?, x = ?, y = ?, z = ?, updated = ? WHERE id = ?')
      .run(Math.round(money), x, y, z, Date.now(), account.id);
    return { ...account, money: Math.round(money), x, y, z };
  }
}
