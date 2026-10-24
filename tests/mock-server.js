'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-mock-'));
process.chdir(temp);
process.env.ADMIN_TOKEN = 'segredo';

const bookings = require('../api/bookings');
const sync = require('../api/sync');

const PORT = Number(process.env.MOCK_PORT || 8099);

function wrap(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const query = Object.fromEntries(url.searchParams.entries());

  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => {
    const body = JSON.stringify(payload);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', Buffer.byteLength(body));
    res.end(body);
    return res;
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  req.query = query;
}

const server = http.createServer((req, res) => {
  wrap(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    if (raw) {
      try { req.body = JSON.parse(raw); } catch (error) { req.body = {}; }
    }

    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const route = url.pathname;

    if (route === '/api/bookings') {
      bookings(req, res).catch((error) => res.status(500).json({ error: String(error.message) }));
      return;
    }

    if (route === '/api/sync') {
      sync(req, res).catch((error) => res.status(500).json({ error: String(error.message) }));
      return;
    }

    res.status(404).json({ error: 'rota desconhecida' });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(JSON.stringify({ ok: true, port: PORT, data: temp }));
});
