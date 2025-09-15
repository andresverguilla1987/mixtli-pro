'use strict';
/**
 * Mixtli ENV resolver (Cloudflare R2 S3)
 * - Acepta S3_BUCKET o (fallback) R2_BUCKET / BUCKET
 * - Fuerza path-style para R2
 * - Logs seguros (sin secretos)
 */
function pick(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}
function parseBool(v, dflt=false) {
  if (v === undefined || v === null || v === '') return dflt;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}
function getEnv() {
  const env = {
    S3_ENDPOINT: pick('S3_ENDPOINT'),
    S3_BUCKET:   pick('S3_BUCKET', 'R2_BUCKET', 'BUCKET'),
    S3_REGION:   pick('S3_REGION') || 'auto',
    S3_KEY_ID:   pick('S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID'),
    S3_SECRET:   pick('S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY'),
    S3_FORCE_PATH_STYLE: parseBool(pick('S3_FORCE_PATH_STYLE'), true),
    ALLOWED_ORIGINS: pick('ALLOWED_ORIGINS')
  };
  if (env.ALLOWED_ORIGINS) {
    try {
      const arr = JSON.parse(env.ALLOWED_ORIGINS);
      if (Array.isArray(arr)) env.ALLOWED_ORIGINS = arr;
    } catch {}
  }
  return env;
}
function logEnvSafe(env) {
  console.log('[ENV CHECK] endpoint:', env.S3_ENDPOINT || '(missing)');
  console.log('[ENV CHECK] bucket:', env.S3_BUCKET || '(missing)');
  console.log('[ENV CHECK] region:', env.S3_REGION || '(missing)');
  console.log('[ENV CHECK] keyId present?', !!env.S3_KEY_ID);
  console.log('[ENV CHECK] forcePathStyle:', env.S3_FORCE_PATH_STYLE);
}
function assertEnv(env) {
  if (!env.S3_ENDPOINT) throw new Error('ConfigError: S3_ENDPOINT no definido');
  if (!env.S3_BUCKET) throw new Error('ConfigError: S3_BUCKET/R2_BUCKET/BUCKET no definido');
  if (!env.S3_KEY_ID) throw new Error('ConfigError: S3_ACCESS_KEY_ID no definido');
  if (!env.S3_SECRET) throw new Error('ConfigError: S3_SECRET_ACCESS_KEY no definido');
}
function buildS3Client(env) {
  const { S3Client } = require('@aws-sdk/client-s3');
  return new S3Client({
    region: env.S3_REGION || 'auto',
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE !== false,
    credentials: { accessKeyId: env.S3_KEY_ID, secretAccessKey: env.S3_SECRET }
  });
}
module.exports = { getEnv, logEnvSafe, assertEnv, buildS3Client };
