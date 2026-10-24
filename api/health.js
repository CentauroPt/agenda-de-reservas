'use strict';

module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    commit: String(process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7),
    ambiente: process.env.VERCEL_ENV || 'local',
    adminToken: !!process.env.ADMIN_TOKEN,
    baseDados: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    google: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    calendario: process.env.GOOGLE_CALENDAR_ID ? 'definido' : 'em falta'
  });
};
