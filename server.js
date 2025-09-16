// server.js — Mixtli API (Option 3 Patch v2, simplified)
// ESM style. Node 18+
// - Uses getSignedUrl + PutObjectCommand (no @aws-sdk/protocol-http / @smithy/hash-node)
// - Fallback BUCKET = S3_BUCKET || R2_BUCKET || BUCKET
// - Path-style for R2
// - Robust ALLOWED_ORIGINS parsing
// - Endpoints: /salud, /api/presign (PUT), /api/list, /_envcheck

import express from 'express';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ---------------- Env helpers ----------------
const pick = (...names) => {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
};

const parseOrigins = (raw) => {
  if (!raw) return [];
  const eq = raw.indexOf('=');
  if (raw.startsWith('ALLOWED_ORIGINS') && eq !== -1) raw = raw.slice(eq + 1);
  raw = raw.trim();
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : []; } catch {}
  return raw
    .replace(/^[\[\s]*/, '')
    .replace(/[\]\s]*$/, '')
    .split(/[\s,]+/)
    .map(s => s.trim().replace(/^"+|"+$/g,''))
    .filter(Boolean);
};

const ENV = {
  ENDPOINT: pick('S3_ENDPOINT'),
  REGION: pick('S3_REGION') || 'auto',
  FORCE_PATH: (pick('S3_FORCE_PATH_STYLE') || 'true').toLowerCase() !== 'false',
  KEY: pick('S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID'),
  SECRET: pick('S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY'),
  BUCKET: pick('S3_BUCKET', 'R2_BUCKET', 'BUCKET'),
  ALLOWED_ORIGINS: parseOrigins(pick('ALLOWED_ORIGINS'))
};

// Normaliza endpoint: quita "/<bucket>" si alguien lo pegó así
if (ENV.ENDPOINT && ENV.BUCKET && /\/[^/]+\/?$/.test(ENV.ENDPOINT)) {
  const tail = ENV.ENDPOINT.substring(ENV.ENDPOINT.lastIndexOf('/')+1).replace(/\/$/, '');
  if (tail === ENV.BUCKET) ENV.ENDPOINT = ENV.ENDPOINT.replace(/\/+[^/]+\/?$/, '');
}

// Validaciones claras (sin secretos)
if (!ENV.ENDPOINT) throw new Error('ConfigError: S3_ENDPOINT no está definido');
if (!ENV.BUCKET)  throw new Error('ConfigError: S3_BUCKET/R2_BUCKET/BUCKET no está definido');
if (!ENV.KEY)     throw new Error('ConfigError: S3_ACCESS_KEY_ID no está definido');
if (!ENV.SECRET)  throw new Error('ConfigError: S3_SECRET_ACCESS_KEY no está definido');

// ---------------- S3 client (R2 compatible) ----------------
const s3 = new S3Client({
  region: ENV.REGION,
  endpoint: ENV.ENDPOINT,
  forcePathStyle: ENV.FORCE_PATH,
  credentials: { accessKeyId: ENV.KEY, secretAccessKey: ENV.SECRET }
});

// ---------------- App ----------------
const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS básico usando la lista permitida
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ENV.ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-mixtli-token');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/salud', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Env check sin secretos
app.get('/_envcheck', (_req, res) => {
  res.json({
    S3_ENDPOINT_present: !!ENV.ENDPOINT,
    S3_BUCKET: ENV.BUCKET,
    S3_REGION: ENV.REGION,
    S3_FORCE_PATH_STYLE: ENV.FORCE_PATH,
    KEY_ID_present: !!ENV.KEY,
    ALLOWED_ORIGINS: ENV.ALLOWED_ORIGINS
  });
});

// -------- Presign (PUT) --------
app.post('/api/presign', async (req, res) => {
  try {
    const { key, contentType = 'application/octet-stream', method = 'PUT' } = req.body || {};
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'BadRequest', message: 'key requerido' });
    if (method !== 'PUT') return res.status(400).json({ error: 'BadRequest', message: 'solo soportado: PUT' });

    const command = new PutObjectCommand({
      Bucket: ENV.BUCKET,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutos
    res.json({ url, key });
  } catch (e) {
    console.error('presign error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- List --------
app.get('/api/list', async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: prefix || undefined }));
    const objects = (out.Contents || []).map(o => ({
      key: o.Key, size: o.Size, lastModified: o.LastModified
    }));
    res.json(objects);
  } catch (e) {
    console.error('list error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API v1.11.0 on :${PORT}`));
