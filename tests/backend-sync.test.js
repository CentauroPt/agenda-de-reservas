'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-backend-'));
process.chdir(temp);

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });

process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: 'sync@teste.iam.gserviceaccount.com',
  private_key: pem
});
process.env.GOOGLE_CALENDAR_ID = 'primario';
process.env.ADMIN_TOKEN = 'segredo';

const store = require('../api/_store');
const sync = require('../api/sync');

const calls = [];
const events = {
  'evt-edit': {
    id: 'evt-edit',
    status: 'confirmed',
    start: { dateTime: '2026-11-03T10:15:00Z' },
    end: { dateTime: '2026-11-03T11:30:00Z' }
  }
};

global.fetch = async (url, options) => {
  const address = String(url);
  calls.push({ url: address, method: (options && options.method) || 'GET' });

  if (address.indexOf('oauth2.googleapis.com/token') !== -1) {
    return new Response(JSON.stringify({ access_token: 'token-teste', expires_in: 3600 }), { status: 200 });
  }

  if (address.indexOf('/events') !== -1) {
    const method = (options && options.method) || 'GET';

    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const id = `evt-${Object.keys(events).length + 1}`;
      events[id] = Object.assign({ id, status: 'confirmed' }, body);
      return new Response(JSON.stringify(events[id]), { status: 200 });
    }

    if (method === 'GET') {
      const id = address.split('/events/')[1].split('?')[0];
      if (!events[id]) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify(events[id]), { status: 200 });
    }
  }

  return new Response('{}', { status: 200 });
};

(async () => {
  await store.writeAll([
    {
      id: 'sem-evento', cancelToken: 'tok-1', locationId: 'loc-1', locationName: 'Torres Vedras',
      date: '2026-11-02', sessionStart: '09:00', sessionEnd: '10:15', schoolName: 'EB 1', email: 'a@b.pt'
    },
    {
      id: 'apagado-no-google', cancelToken: 'tok-2', locationId: 'loc-1', locationName: 'Torres Vedras',
      date: '2026-11-02', sessionStart: '10:15', sessionEnd: '11:30', schoolName: 'EB 2', email: 'c@d.pt',
      googleEventId: 'evt-old'
    },
    {
      id: 'alterado-no-google', cancelToken: 'tok-3', locationId: 'loc-1', locationName: 'Torres Vedras',
      date: '2026-11-03', sessionStart: '09:00', sessionEnd: '10:15', schoolName: 'EB 3', email: 'e@f.pt',
      googleEventId: 'evt-edit'
    }
  ]);

  const response = {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader() {}
  };

  await sync({ method: 'POST', headers: { 'x-admin-token': 'segredo' } }, response);

  assert.strictEqual(response.statusCode, 200, 'status 200');
  assert.strictEqual(response.body.pushed, 1, 'um evento criado');
  assert.strictEqual(response.body.removed, 1, 'uma reserva apagada');
  assert.strictEqual(response.body.updated, 1, 'uma reserva alterada');
  assert.strictEqual(response.body.failed, 0, 'sem falhas');

  const final = await store.readAll();
  assert.strictEqual(final.length, 2, 'ficaram duas reservas');

  const pushed = final.find((item) => item.id === 'sem-evento');
  assert.ok(pushed.googleEventId, 'reserva nova ficou com evento');

  const updated = final.find((item) => item.id === 'alterado-no-google');
  assert.strictEqual(updated.date, '2026-11-03');
  assert.strictEqual(updated.sessionStart, '10:15');
  assert.strictEqual(updated.sessionEnd, '11:30');

  const removedStillThere = final.find((item) => item.id === 'apagado-no-google');
  assert.strictEqual(removedStillThere, undefined, 'reserva apagada no Google desapareceu');

  const denied = { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(p) { this.body = p; return this; }, setHeader() {} };
  await sync({ method: 'POST', headers: {} }, denied);
  assert.strictEqual(denied.statusCode, 401, 'sem token devolve 401');

  console.log(JSON.stringify({
    ok: true,
    result: response.body,
    remaining: final.map((item) => ({ id: item.id, date: item.date, start: item.sessionStart, event: item.googleEventId || null })),
    googleCalls: calls.length
  }, null, 2));
})().catch((error) => {
  console.error('FALHOU:', error.message);
  process.exit(1);
});
