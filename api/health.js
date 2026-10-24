// diagnostico de configuracao da API
'use strict';

const store = require('./_store');

module.exports = async (req, res) => {
  let armazenamento = 'nao testado';

  try {
    const list = await store.readAll();
    armazenamento = `ok (${list.length} reserva(s))`;
  } catch (error) {
    armazenamento = `falhou: ${String((error && error.message) || error).slice(0, 160)}`;
  }

  res.status(200).json({
    ok: true,
    commit: String(process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7),
    ambiente: process.env.VERCEL_ENV || 'local',
    adminToken: !!process.env.ADMIN_TOKEN,
    baseDados: !!((process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)
      && (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)),
    google: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    calendario: process.env.GOOGLE_CALENDAR_ID ? 'definido' : 'em falta',
    armazenamento
  });
};
