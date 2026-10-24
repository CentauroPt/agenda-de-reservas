'use strict';

const fs = require('fs');
const path = require('path');

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FILE = path.join(process.cwd(), '.data', 'bookings.json');

async function kv(command) {
  const response = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error(`KV ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  const data = await response.json();
  return data.result;
}

async function readAll() {
  if (KV_URL && KV_TOKEN) {
    const raw = await kv(['GET', 'agenda:bookings']);
    return raw ? JSON.parse(raw) : [];
  }

  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

async function writeAll(list) {
  if (KV_URL && KV_TOKEN) {
    await kv(['SET', 'agenda:bookings', JSON.stringify(list)]);
    return;
  }

  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

module.exports = { readAll, writeAll };
