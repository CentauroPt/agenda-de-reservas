'use strict';

const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

let cached = { token: null, expires: 0 };

async function accessToken() {
  if (cached.token && Date.now() < cached.expires - 60000) return cached.token;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON nao definido');

  const account = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(account.private_key));

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`
    })
  });

  if (!response.ok) {
    throw new Error(`Google token ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  const data = await response.json();
  cached = { token: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return cached.token;
}

function calendarId() {
  return process.env.GOOGLE_CALENDAR_ID || 'primary';
}

function eventBody(booking) {
  return {
    summary: `Creactivity — ${booking.schoolName || 'Escola'}`,
    description: [
      `${booking.students || 0} alunos${booking.grade ? ' · ' + booking.grade : ''}`,
      `Responsável: ${booking.firstName || ''} ${booking.lastName || ''} (${booking.phone || ''})`,
      `Acompanhante: ${booking.companionName || ''} (${booking.companionPhone || ''})`,
      `Localidade: ${booking.locationName || ''}`,
      `Referência: ${booking.id || ''}`
    ].join('\n'),
    location: booking.locationName || '',
    start: { dateTime: `${booking.date}T${booking.sessionStart}:00`, timeZone: 'Europe/Lisbon' },
    end: { dateTime: `${booking.date}T${booking.sessionEnd}:00`, timeZone: 'Europe/Lisbon' },
    extendedProperties: { private: { agendaBooking: '1', agendaId: booking.id || '' } }
  };
}

async function api(path, options) {
  const token = await accessToken();
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, Object.assign({}, options || {}, {
    headers: Object.assign({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }, (options && options.headers) || {})
  }));

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Google API ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  return response.json();
}

async function insertEvent(booking) {
  return api(`/calendars/${encodeURIComponent(calendarId())}/events`, {
    method: 'POST',
    body: JSON.stringify(eventBody(booking))
  });
}

async function updateEvent(eventId, booking) {
  return api(`/calendars/${encodeURIComponent(calendarId())}/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(eventBody(booking))
  });
}

async function deleteEvent(eventId) {
  return api(`/calendars/${encodeURIComponent(calendarId())}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE'
  });
}

async function getEvent(eventId) {
  return api(`/calendars/${encodeURIComponent(calendarId())}/events/${encodeURIComponent(eventId)}`);
}

module.exports = { accessToken, insertEvent, updateEvent, deleteEvent, getEvent, eventBody, calendarId };
