'use strict';
/**
 * env-bootstrap.js
 * Asegura que las variables críticas existan ANTES de cargar server.js.
 * - S3_BUCKET toma de S3_BUCKET || R2_BUCKET || BUCKET || 'mixtli' (último recurso).
 * - S3_FORCE_PATH_STYLE=true por defecto (recomendado para R2).
 * - S3_ENDPOINT: si viene con '/<bucket>' al final, lo recorta.
 * - ALLOWED_ORIGINS: sanea formato para que no truene JSON.parse en tu server.
 */

function pick(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

function sanitizeAllowedOrigins(raw) {
  if (!raw) return '';
  // Permite que alguien pegue 'ALLOWED_ORIGINS=[...]'
  const eq = raw.indexOf('=');
  if (raw.startsWith('ALLOWED_ORIGINS') && eq !== -1) raw = raw.slice(eq + 1);
  raw = raw.trim();
  try { JSON.parse(raw); return raw; } catch {}
  // Normaliza a JSON array
  raw = raw.replace(/^[\[\s]*/, '').replace(/[\]\s]*$/, '');
  const parts = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean).map(s => s.replace(/^"+|"+$/g, ''));
  return '[' + parts.map(s => JSON.stringify(s)).join(',') + ']';
}

(function bootstrap() {
  // --- Bucket ---
  let bucket = pick('S3_BUCKET', 'R2_BUCKET', 'BUCKET');
  if (!bucket) {
    bucket = 'mixtli'; // último recurso para no caer; ajusta si tu bucket se llama distinto
    process.env.S3_BUCKET = bucket;
    console.warn('[env-bootstrap] S3_BUCKET no estaba definido. Usando valor por defecto:', bucket);
  } else if (!process.env.S3_BUCKET) {
    process.env.S3_BUCKET = bucket;
    console.log('[env-bootstrap] S3_BUCKET tomado de alias:', bucket);
  }

  // --- Endpoint ---
  const ep = pick('S3_ENDPOINT');
  if (ep) {
    // si viene con '/bucket' al final, recórtalo
    const m = ep.match(/^https?:\/\/[^\/]+\/([^\/]+)\/?$/);
    if (m && m[1] && m[1] === process.env.S3_BUCKET) {
      const base = ep.replace(/\/+[^\/]+\/?$/, '');
      process.env.S3_ENDPOINT = base;
      console.log('[env-bootstrap] S3_ENDPOINT normalizado a base host:', base);
    }
  }

  // --- forcePathStyle ---
  if (!('S3_FORCE_PATH_STYLE' in process.env)) {
    process.env.S3_FORCE_PATH_STYLE = 'true';
    console.log('[env-bootstrap] S3_FORCE_PATH_STYLE=true (default)');
  }

  // --- Allowed Origins ---
  if (process.env.ALLOWED_ORIGINS) {
    const cleaned = sanitizeAllowedOrigins(process.env.ALLOWED_ORIGINS);
    process.env.ALLOWED_ORIGINS = cleaned;
    console.log('[env-bootstrap] ALLOWED_ORIGINS saneado:', cleaned);
  }

  // Log seguro
  console.log('[env-bootstrap] endpoint:', process.env.S3_ENDPOINT || '(missing)');
  console.log('[env-bootstrap] bucket:', process.env.S3_BUCKET || '(missing)');
  console.log('[env-bootstrap] keyId present?', !!pick('S3_ACCESS_KEY_ID','AWS_ACCESS_KEY_ID'));
  console.log('[env-bootstrap] pathStyle:', process.env.S3_FORCE_PATH_STYLE);

  // Carga tu servidor real
  require('./server.js');
})();
