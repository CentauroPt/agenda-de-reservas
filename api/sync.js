'use strict';

const store = require('./_store');
const google = require('./_google');
const cors = require('./_cors');

function authorized(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const header = req.headers['x-admin-token'] || '';
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return header === token || bearer === token;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  cors.applyCors(res);
  if (cors.handlePreflight(req, res)) return;

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'metodo nao suportado' });
    }

    if (!authorized(req)) return res.status(401).json({ error: 'nao autorizado' });

    const list = await store.readAll();
    let pushed = 0;
    let updated = 0;
    let removed = 0;
    let failed = 0;

    // App -> Google: cria eventos para reservas que ainda nao tem evento
    for (const booking of list) {
      if (booking.googleEventId) continue;
      try {
        const event = await google.insertEvent(booking);
        booking.googleEventId = event.id;
        pushed++;
      } catch (error) {
        failed++;
      }
    }

    // Google -> App: reflete alteracoes/cancelamentos feitos no calendario
    for (let index = list.length - 1; index >= 0; index--) {
      const booking = list[index];
      if (!booking.googleEventId) continue;

      try {
        const event = await google.getEvent(booking.googleEventId);

        if (!event || event.status === 'cancelled') {
          list.splice(index, 1);
          removed++;
          continue;
        }

        const start = event.start && (event.start.dateTime || event.start.date);
        const end = event.end && (event.end.dateTime || event.end.date);
        if (!start || !end) continue;

        const date = start.slice(0, 10);
        const startTime = start.length > 10 ? start.slice(11, 16) : '00:00';
        const endTime = end.length > 10 ? end.slice(11, 16) : '23:59';

        if (booking.date !== date || booking.sessionStart !== startTime || booking.sessionEnd !== endTime) {
          booking.date = date;
          booking.sessionStart = startTime;
          booking.sessionEnd = endTime;
          updated++;
        }
      } catch (error) {
        failed++;
      }
    }

    await store.writeAll(list);

    return res.status(200).json({
      ok: true,
      ranAt: new Date().toISOString(),
      day: todayISO(),
      pushed,
      updated,
      removed,
      failed,
      total: list.length
    });
  } catch (error) {
    return res.status(500).json({ error: String((error && error.message) || error) });
  }
};
