// Datenbank auf Cloudflare D1 – gleiche Methoden wie server/db.js (SQLite unter Node), nur asynchron.
import { SCHEMA, enc, hex } from '../server/store-schema.js';

const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(24)));

let schemaReady = null;

export class D1Store {
  constructor(d1) { this.d1 = d1; }

  async ready() {
    if (!schemaReady) {
      schemaReady = this.d1.batch(SCHEMA.map((s) => this.d1.prepare(s))).catch((e) => { schemaReady = null; throw e; });
    }
    await schemaReady;
  }

  async createAccount() {
    await this.ready();
    const now = Date.now();
    const token = randomToken();
    const r = await this.d1.prepare('INSERT INTO accounts (token_hash, created, updated) VALUES (?, ?, ?)')
      .bind(await sha(token), now, now).run();
    const account = await this.d1.prepare('SELECT * FROM accounts WHERE id = ?').bind(r.meta.last_row_id).first();
    return { token, account };
  }

  async getByToken(token) {
    if (typeof token !== 'string' || token.length < 20) return null;
    await this.ready();
    return (await this.d1.prepare('SELECT * FROM accounts WHERE token_hash = ?').bind(await sha(token)).first()) || null;
  }

  async saveState(token, { money, x, y, z }) {
    const account = await this.getByToken(token);
    if (!account) return null;
    await this.d1.prepare('UPDATE accounts SET money = ?, x = ?, y = ?, z = ?, updated = ? WHERE id = ?')
      .bind(Math.round(money), x, y, z, Date.now(), account.id).run();
    return { ...account, money: Math.round(money), x, y, z };
  }
}
