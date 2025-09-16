// server.js — Mixtli API PRO (v5)
// ESM ("type":"module"). Node 18+
// Features:
// - API token (x-mixtli-token) via env API_TOKEN
// - Presign PUT/GET with optional filename + expiresIn
// - List with pagination (limit, token)
// - Delete object
// - Move/Rename object (CopyObject + DeleteObject)
// - HEAD/metadata endpoint
// - Optional ROOT_PREFIX guard (limita prefijos autorizados)
// - Robust CORS (ALLOWED_ORIGINS JSON)
// - Allowed MIME filtering (ALLOWED_MIME CSV)
// - Path-style S3 (R2) support
//
// Env needed:
// S3_ENDPOINT, S3_BUCKET, S3_REGION=auto, S3_FORCE_PATH_STYLE=true
// S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
// ALLOWED_ORIGINS='["https://<tu-netlify>.app"]'
// API_TOKEN=<secreto opcional>
// ALLOWED_MIME='image/jpeg,image/png,text/plain,application/pdf'
// ROOT_PREFIX=clientes/acme/   (opcional)

import express from 'express';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
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
    .replace(/^\[\s]*/, '')
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
  ALLOWED_ORIGINS: parseOrigins(pick('ALLOWED_ORIGINS')),
  API_TOKEN: pick('API_TOKEN'),
  ALLOWED_MIME: (pick('ALLOWED_MIME') || 'image/jpeg,image/png,text/plain,application/pdf').split(',').map(s=>s.trim()).filter(Boolean),
  ROOT_PREFIX: pick('ROOT_PREFIX')
};

// Normaliza endpoint si vino con /<bucket>
if (ENV.ENDPOINT && ENV.BUCKET && /\/[^/]+\/?$/.test(ENV.ENDPOINT)) {
  const tail = ENV.ENDPOINT.substring(ENV.ENDPOINT.lastIndexOf('/')+1).replace(/\/$/, '');
  if (tail === ENV.BUCKET) ENV.ENDPOINT = ENV.ENDPOINT.replace(/\/+[^/]+\/?$/, '');
}

// Validaciones
if (!ENV.ENDPOINT) throw new Error('ConfigError: S3_ENDPOINT no está definido');
if (!ENV.BUCKET)  throw new Error('ConfigError: S3_BUCKET/R2_BUCKET/BUCKET no está definido');
if (!ENV.KEY)     throw new Error('ConfigError: S3_ACCESS_KEY_ID no está definido');
if (!ENV.SECRET)  throw new Error('ConfigError: S3_SECRET_ACCESS_KEY no está definido');

// Helpers
const within = (k) => !ENV.ROOT_PREFIX || (k || '').startsWith(ENV.ROOT_PREFIX);

// ---------------- S3 client ----------------
const s3 = new S3Client({
  region: ENV.REGION,
  endpoint: ENV.ENDPOINT,
  forcePathStyle: ENV.FORCE_PATH,
  credentials: { accessKeyId: ENV.KEY, secretAccessKey: ENV.SECRET }
});

// ---------------- App ----------------
const app = express();
app.use(express.json({ limit: '20mb' }));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ENV.ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-mixtli-token');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Auth middleware (opcional)
app.use((req, res, next) => {
  if (!ENV.API_TOKEN) return next();
  const t = req.headers['x-mixtli-token'];
  if (t !== ENV.API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
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
    ALLOWED_ORIGINS: ENV.ALLOWED_ORIGINS,
    ALLOWED_MIME: ENV.ALLOWED_MIME,
    AUTH: !!ENV.API_TOKEN,
    ROOT_PREFIX: ENV.ROOT_PREFIX || null
  });
});

// -------- Presign (PUT/GET) --------
app.post('/api/presign', async (req, res) => {
  try {
    const { key, contentType = 'application/octet-stream', method = 'PUT', expiresIn = 300, filename } = req.body || {};
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'BadRequest', message: 'key requerido' });
    if (!within(key)) return res.status(403).json({ error:'Forbidden', message:'key fuera de ROOT_PREFIX' });

    if (method === 'PUT') {
      // Validar mime
      if (ENV.ALLOWED_MIME.length && contentType && !ENV.ALLOWED_MIME.includes(contentType)) {
        return res.status(400).json({ error: 'BadRequest', message: 'tipo no permitido' });
      }
      const cmd = new PutObjectCommand({ Bucket: ENV.BUCKET, Key: key, ContentType: contentType });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      return res.json({ url, key, method: 'PUT', expiresIn });
    }

    if (method === 'GET') {
      const cmd = new GetObjectCommand({
        Bucket: ENV.BUCKET,
        Key: key,
        ...(filename ? { ResponseContentDisposition: `attachment; filename="${filename}"` } : {})
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      return res.json({ url, key, method: 'GET', expiresIn });
    }

    return res.status(400).json({ error: 'BadRequest', message: 'método soportado: PUT o GET' });
  } catch (e) {
    console.error('presign error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- List (paginado) --------
app.get('/api/list', async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    if (!within(prefix)) return res.status(403).json({ error:'Forbidden', message:'prefix fuera de ROOT_PREFIX' });

    const MaxKeys = Math.min(parseInt(req.query.limit || '50', 10), 1000);
    const ContinuationToken = req.query.token ? decodeURIComponent(req.query.token.toString()) : undefined;

    const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: prefix || undefined, MaxKeys, ContinuationToken }));
    res.json({
      items: (out.Contents || []).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified })),
      nextToken: out.IsTruncated ? encodeURIComponent(out.NextContinuationToken) : null
    });
  } catch (e) {
    console.error('list error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- Delete --------
app.delete('/api/object', async (req, res) => {
  try {
    const key = (req.query.key || '').toString();
    if (!key) return res.status(400).json({ error: 'BadRequest', message: 'key requerido' });
    if (!within(key)) return res.status(403).json({ error:'Forbidden', message:'key fuera de ROOT_PREFIX' });

    await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
    res.json({ ok: true, key });
  } catch (e) {
    console.error('delete error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- Move / Rename --------
app.post('/api/move', async (req, res) => {
  try {
    const { from, to } = req.body || {};
    if (!from || !to) return res.status(400).json({ error:'BadRequest', message:'from/to requeridos' });
    if (!within(from) || !within(to)) return res.status(403).json({ error:'Forbidden', message:'fuera de ROOT_PREFIX' });

    await s3.send(new CopyObjectCommand({
      Bucket: ENV.BUCKET,
      CopySource: `/${ENV.BUCKET}/${encodeURIComponent(from)}`.replace(/%2F/g,'/'),
      Key: to
    }));
    await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: from }));
    res.json({ ok:true, from, to });
  } catch (e) {
    console.error('move error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

// -------- HEAD / metadata --------
app.get('/api/head', async (req, res) => {
  try {
    const key = (req.query.key || '').toString();
    if (!key) return res.status(400).json({ error:'BadRequest', message:'key requerido' });
    if (!within(key)) return res.status(403).json({ error:'Forbidden', message:'key fuera de ROOT_PREFIX' });

    const out = await s3.send(new HeadObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
    res.json({
      key,
      size: out.ContentLength,
      contentType: out.ContentType,
      lastModified: out.LastModified
    });
  } catch (e) {
    console.error('head error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API PRO v5 on :${PORT}`));
