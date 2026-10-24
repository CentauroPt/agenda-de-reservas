'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-bookings-'));
process.chdir(temp);
process.env.ADMIN_TOKEN = 'segredo';

const store = require('../api/_store');
const bookings = require('../api/bookings');

function makeResponse() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader(name, value) { this.headers[name] = value; }
  };
}

const base = {
  locationId: 'loc-1',
  locationName: 'Torres Vedras',
  date: '2026-11-05',
  sessionStart: '09:00',
  sessionEnd: '10:15',
  schoolName: 'EB 1',
  students: 20,
  grade: '4',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@escola.pt',
  phone: '912345678'
};

(async () => {
  await store.writeAll([]);

  const created = makeResponse();
  await bookings({ method: 'POST', headers: {}, body: base }, created);
  assert.strictEqual(created.statusCode, 201, 'criar devolve 201');
  assert.ok(created.body.booking.id, 'tem id');
  assert.strictEqual(created.body.booking.cancelToken.length, 24, 'token com 24 caracteres');

  const duplicated = makeResponse();
  await bookings({ method: 'POST', headers: {}, body: base }, duplicated);
  assert.strictEqual(duplicated.statusCode, 409, 'duplicado devolve 409');

  const invalid = makeResponse();
  await bookings({ method: 'POST', headers: {}, body: Object.assign({}, base, { email: '' }) }, invalid);
  assert.strictEqual(invalid.statusCode, 400, 'sem email devolve 400');

  const denied = makeResponse();
  await bookings({ method: 'GET', headers: {} }, denied);
  assert.strictEqual(denied.statusCode, 401, 'listar sem token devolve 401');

  const listed = makeResponse();
  await bookings({ method: 'GET', headers: { 'x-admin-token': 'segredo' } }, listed);
  assert.strictEqual(listed.statusCode, 200, 'listar com token devolve 200');
  assert.strictEqual(listed.body.bookings.length, 1, 'uma reserva');

  const wrongToken = makeResponse();
  await bookings({ method: 'DELETE', headers: {}, query: { token: 'nao-existe' } }, wrongToken);
  assert.strictEqual(wrongToken.statusCode, 404, 'token invalido devolve 404');

  const cancelled = makeResponse();
  await bookings({ method: 'DELETE', headers: {}, query: { token: created.body.booking.cancelToken } }, cancelled);
  assert.strictEqual(cancelled.statusCode, 200, 'cancelar devolve 200');

  const empty = await store.readAll();
  assert.strictEqual(empty.length, 0, 'lista ficou vazia');

  console.log(JSON.stringify({
    ok: true,
    checks: ['201 criar', '409 duplicado', '400 invalido', '401 sem token', '200 listar', '404 token errado', '200 cancelar', 'lista vazia']
  }, null, 2));
})().catch((error) => {
  console.error('FALHOU:', error.message);
  process.exit(1);
});
