'use strict';
/**
 * Adjunta /debug/env (solo si DEBUG_ENV=true)
 * No expone secretos.
 * Úsalo temporalmente mientras corriges envs.
 */
function attachDebug(app, env) {
  const enable = String(process.env.DEBUG_ENV || '').toLowerCase() === 'true';
  if (!enable) return;
  app.get('/debug/env', (_req, res) => {
    res.json({
      DEBUG_ENV: true,
      S3_ENDPOINT_present: !!env.S3_ENDPOINT,
      S3_BUCKET: env.S3_BUCKET || '(missing)',
      S3_REGION: env.S3_REGION || '(missing)',
      S3_FORCE_PATH_STYLE: env.S3_FORCE_PATH_STYLE,
      KEY_ID_present: !!env.S3_KEY_ID,
      ALLOWED_ORIGINS: Array.isArray(env.ALLOWED_ORIGINS) ? env.ALLOWED_ORIGINS : env.ALLOWED_ORIGINS || '(missing)'
    });
  });
  console.log('[DEBUG] /debug/env habilitado (quitar cuando termines)');
}
module.exports = { attachDebug };
