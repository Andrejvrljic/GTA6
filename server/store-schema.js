// Datenbankschema, gemeinsam für lokales SQLite (Node) und Cloudflare D1.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT UNIQUE NOT NULL,
    money      INTEGER NOT NULL DEFAULT 2500,
    x          REAL NOT NULL DEFAULT 20,
    y          REAL NOT NULL DEFAULT 1,
    z          REAL NOT NULL DEFAULT 20,
    created    INTEGER NOT NULL,
    updated    INTEGER NOT NULL
  )`,
];

export const enc = new TextEncoder();
export const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
