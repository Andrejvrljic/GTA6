import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { LocalStore } from './db.js';
import { handleApi } from './api.js';
import { Arena } from './arena.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const store = new LocalStore(process.env.DB_PATH || path.join(__dirname, '..', 'data', 'gta6.db'));
const arena = new Arena();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res) {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, reqPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 16 * 1024) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, version: process.env.GITHUB_SHA || 'dev' }));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    try {
      const raw = req.method === 'POST' ? await readBody(req) : '';
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { /* leer bleibt leer */ }
      const r = await handleApi(store, { method: req.method, path: url.pathname, body });
      res.writeHead(r.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(r.data));
    } catch (e) {
      console.error(e);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Serverfehler' }));
    }
    return;
  }

  serveStatic(req, res);
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  const conn = arena.connect((text) => ws.send(text));
  ws.on('message', (data) => arena.message(conn, data.toString()));
  ws.on('close', () => arena.close(conn));
});

server.listen(PORT, () => {
  console.log(`GTA6 läuft auf http://localhost:${PORT}`);
});
