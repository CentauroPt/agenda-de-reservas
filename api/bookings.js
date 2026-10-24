'use strict';

const crypto = require('crypto');
const store = require('./_store');

function authorized(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const header = req.headers['x-admin-token'] || '';
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return header === token || bearer === token;
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body;
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const list = await store.readAll();

      if (!authorized(req)) {
        return res.status(200).json({
          bookings: list.map((item) => ({
            locationId: item.locationId,
            locationName: item.locationName,
            date: item.date,
            sessionStart: item.sessionStart,
            sessionEnd: item.sessionEnd
          }))
        });
      }

      return res.status(200).json({ bookings: list });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const required = ['locationId', 'locationName', 'date', 'sessionStart', 'sessionEnd', 'schoolName', 'email'];

      for (const field of required) {
        if (!body[field]) return res.status(400).json({ error: `campo obrigatorio: ${field}` });
      }

      if (process.env.VERCEL && !(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)) {
        return res.status(503).json({ error: 'base de dados nao configurada (KV_REST_API_URL/KV_REST_API_TOKEN)' });
      }

      const list = await store.readAll();
      const duplicate = list.find((item) => item.locationId === body.locationId
        && item.date === body.date
        && item.sessionStart === body.sessionStart);

      if (duplicate) return res.status(409).json({ error: 'horario ja reservado' });

      const booking = {
        id: crypto.randomUUID(),
        cancelToken: crypto.randomBytes(12).toString('hex'),
        locationId: body.locationId,
        locationName: body.locationName,
        date: body.date,
        sessionStart: body.sessionStart,
        sessionEnd: body.sessionEnd,
        duration: body.duration || null,
        schoolName: body.schoolName,
        students: body.students || 0,
        grade: body.grade || '',
        firstName: body.firstName || '',
        lastName: body.lastName || '',
        email: body.email,
        phone: body.phone || '',
        companionName: body.companionName || '',
        companionPhone: body.companionPhone || '',
        laCaixa: body.laCaixa || 'Nao',
        laCaixaDetails: body.laCaixaDetails || '',
        createdAt: new Date().toISOString()
      };

      list.push(booking);
      await store.writeAll(list);
      return res.status(201).json({ booking });
    }

    if (req.method === 'DELETE') {
      const bookingId = (req.query && req.query.id) || '';

      if (bookingId) {
        if (!authorized(req)) return res.status(401).json({ error: 'nao autorizado' });
        const all = await store.readAll();
        const position = all.findIndex((item) => item.id === bookingId);
        if (position < 0) return res.status(404).json({ error: 'reserva nao encontrada' });
        const [gone] = all.splice(position, 1);
        await store.writeAll(all);
        return res.status(200).json({ cancelled: gone.id, googleEventId: gone.googleEventId || null });
      }

      const token = (req.query && req.query.token) || '';
      if (!token) return res.status(400).json({ error: 'token em falta' });

      const list = await store.readAll();
      const index = list.findIndex((item) => item.cancelToken === token);
      if (index < 0) return res.status(404).json({ error: 'reserva nao encontrada' });

      const removed = list.splice(index, 1)[0];
      await store.writeAll(list);
      return res.status(200).json({ cancelled: removed.id, googleEventId: removed.googleEventId || null });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'metodo nao suportado' });
  } catch (error) {
    return res.status(500).json({ error: String((error && error.message) || error) });
  }
};
