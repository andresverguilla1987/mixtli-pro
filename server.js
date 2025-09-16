// server.js — Mixtli API PRO (v6)
// ESM ("type":"module"). Node 18+
// Features vs v5:
// 1) /api/list2 con carpetas (Delimiter='/') y breadcrumb friendly
// 2) /api/folder (crear carpeta lógica)
// 3) Acciones masivas: /api/deleteMany, /api/moveMany
// 4) Multipart upload: /api/multipart/create | /api/multipart/partUrl | /api/multipart/complete | /api/multipart/abort
// 5) Seguridad extra: ROOT_PREFIX global o por token (TOKEN_PREFIX_MAP JSON), rate limit simple y auditoría opcional
//
// Env base: igual v5 (S3_ENDPOINT, S3_BUCKET, S3_REGION=auto, S3_FORCE_PATH_STYLE=true, keys...)
// Extra opcionales:
// TOKEN_PREFIX_MAP='{"<tokenA>":"tenantA/","<tokenB>":"tenantB/"}'
// RATE_LIMIT_PER_MIN=120
// AUDIT=true

import express from 'express';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
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
    .map(s => s.trim().replace(/^\"+|\"+$/g,''))
    .filter(Boolean);
};

const parseJSON = (raw) => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
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
  ALLOWED_MIME: (pick('ALLOWED_MIME') || 'image/jpeg,image/png,text/plain,application/pdf,application/pdf').split(',').map(s=>s.trim()).filter(Boolean),
  ROOT_PREFIX: pick('ROOT_PREFIX'),
  TOKEN_PREFIX_MAP: parseJSON(pick('TOKEN_PREFIX_MAP')) || {},
  RATE_LIMIT: parseInt(pick('RATE_LIMIT_PER_MIN') || '120', 10),
  AUDIT: (pick('AUDIT') || '').toLowerCase() === 'true',
};

if (ENV.ENDPOINT && ENV.BUCKET && /\/[^/]+\/?$/.test(ENV.ENDPOINT)) {
  const tail = ENV.ENDPOINT.substring(ENV.ENDPOINT.lastIndexOf('/')+1).replace(/\/$/, '');
  if (tail === ENV.BUCKET) ENV.ENDPOINT = ENV.ENDPOINT.replace(/\/+[^/]+\/?$/, '');
}

if (!ENV.ENDPOINT) throw new Error('ConfigError: S3_ENDPOINT no está definido');
if (!ENV.BUCKET)  throw new Error('ConfigError: S3_BUCKET/R2_BUCKET/BUCKET no está definido');
if (!ENV.KEY)     throw new Error('ConfigError: S3_ACCESS_KEY_ID no está definido');
if (!ENV.SECRET)  throw new Error('ConfigError: S3_SECRET_ACCESS_KEY no está definido');

const basePrefixForToken = (token) => {
  const mapped = token && ENV.TOKEN_PREFIX_MAP && ENV.TOKEN_PREFIX_MAP[token];
  return (mapped || ENV.ROOT_PREFIX || '');
};

const within = (key, token) => {
  const root = basePrefixForToken(token);
  return !root || (key || '').startsWith(root);
};

// ---------------- S3 client ----------------
const s3 = new S3Client({
  region: ENV.REGION,
  endpoint: ENV.ENDPOINT,
  forcePathStyle: ENV.FORCE_PATH,
  credentials: { accessKeyId: ENV.KEY, secretAccessKey: ENV.SECRET }
});

// ---------------- App ----------------
const app = express();
app.use(express.json({ limit: '50mb' }));

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

// Auth + token-root map
app.use((req, res, next) => {
  if (!ENV.API_TOKEN) return next();
  const t = req.headers['x-mixtli-token'];
  if (t !== ENV.API_TOKEN && !ENV.TOKEN_PREFIX_MAP[t]) return res.status(401).json({ error: 'Unauthorized' });
  req._mixtliToken = t;
  next();
});

// Rate limit simple (token o IP)
const buckets = new Map();
setInterval(()=> buckets.clear(), 60_000).unref();
app.use((req, res, next) => {
  const id = req._mixtliToken || req.ip;
  const max = ENV.RATE_LIMIT || 120;
  const count = (buckets.get(id) || 0) + 1;
  buckets.set(id, count);
  if (count > max) return res.status(429).json({ error: 'TooManyRequests' });
  next();
});

const audit = (evt, extra={}) => {
  if (!ENV.AUDIT) return;
  const base = {
    time: new Date().toISOString(),
  };
  console.log('[AUDIT]', JSON.stringify({evt, ...base, ...extra}));
};

app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/salud', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/_envcheck', (req, res) => {
  const root = basePrefixForToken(req._mixtliToken);
  res.json({
    S3_ENDPOINT_present: !!ENV.ENDPOINT,
    S3_BUCKET: ENV.BUCKET,
    S3_REGION: ENV.REGION,
    S3_FORCE_PATH_STYLE: ENV.FORCE_PATH,
    KEY_ID_present: !!ENV.KEY,
    ALLOWED_ORIGINS: ENV.ALLOWED_ORIGINS,
    ALLOWED_MIME: ENV.ALLOWED_MIME,
    AUTH: !!ENV.API_TOKEN || !!ENV.TOKEN_PREFIX_MAP,
    ROOT_PREFIX: root || null
  });
});

// -------- Presign (PUT/GET) --------
app.post('/api/presign', async (req, res) => {
  try {
    const { key, contentType = 'application/octet-stream', method = 'PUT', expiresIn = 300, filename } = req.body || {};
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'BadRequest', message: 'key requerido' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden', message:'key fuera de ROOT_PREFIX' });

    if (method === 'PUT') {
      if (ENV.ALLOWED_MIME.length && contentType && !ENV.ALLOWED_MIME.includes(contentType)) {
        return res.status(400).json({ error: 'BadRequest', message: 'tipo no permitido' });
      }
      const cmd = new PutObjectCommand({ Bucket: ENV.BUCKET, Key: key, ContentType: contentType });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      audit('presign_put', { key });
      return res.json({ url, key, method: 'PUT', expiresIn });
    }

    if (method === 'GET') {
      const cmd = new GetObjectCommand({
        Bucket: ENV.BUCKET,
        Key: key,
        ...(filename ? { ResponseContentDisposition: `attachment; filename="${filename}"` } : {})
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      audit('presign_get', { key });
      return res.json({ url, key, method: 'GET', expiresIn });
    }

    return res.status(400).json({ error: 'BadRequest', message: 'método soportado: PUT o GET' });
  } catch (e) {
    console.error('presign error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- List (paginado simple) --------
app.get('/api/list', async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    if (!within(prefix, req._mixtliToken)) return res.status(403).json({ error:'Forbidden', message:'prefix fuera de ROOT_PREFIX' });

    const MaxKeys = Math.min(parseInt(req.query.limit || '50', 10), 1000);
    const ContinuationToken = req.query.token ? decodeURIComponent(req.query.token.toString()) : undefined;

    const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: prefix || undefined, MaxKeys, ContinuationToken }));
    audit('list', { prefix, count: (out.Contents || []).length });
    res.json({
      items: (out.Contents || []).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified })),
      nextToken: out.IsTruncated ? encodeURIComponent(out.NextContinuationToken) : null
    });
  } catch (e) {
    console.error('list error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- List con carpetas (Delimiter='/') --------
app.get('/api/list2', async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    if (!within(prefix, req._mixtliToken)) return res.status(403).json({ error:'Forbidden', message:'prefix fuera de ROOT_PREFIX' });
    const MaxKeys = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    const ContinuationToken = req.query.token ? decodeURIComponent(req.query.token.toString()) : undefined;
    const out = await s3.send(new ListObjectsV2Command({
      Bucket: ENV.BUCKET, Prefix: prefix || undefined, MaxKeys, ContinuationToken, Delimiter: '/'
    }));
    audit('list2', { prefix, count: (out.Contents || []).length, folders: (out.CommonPrefixes || []).length });
    res.json({
      folders: (out.CommonPrefixes || []).map(p => p.Prefix),
      items: (out.Contents || []).filter(o => o.Key !== prefix).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified })),
      nextToken: out.IsTruncated ? encodeURIComponent(out.NextContinuationToken) : null
    });
  } catch (e) {
    console.error('list2 error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- Crear "carpeta" --------
app.post('/api/folder', async (req, res) => {
  try {
    let { prefix } = req.body || {};
    if (!prefix) return res.status(400).json({ error:'BadRequest', message:'prefix requerido' });
    if (!prefix.endsWith('/')) prefix += '/';
    if (!within(prefix, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    // objeto marcador vacío
    const cmd = new PutObjectCommand({ Bucket: ENV.BUCKET, Key: prefix, Body: '' });
    await s3.send(cmd);
    audit('folder_create', { prefix });
    res.json({ ok:true, prefix });
  } catch (e) {
    console.error('folder error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

// -------- Delete --------
app.delete('/api/object', async (req, res) => {
  try {
    const key = (req.query.key || '').toString();
    if (!key) return res.status(400).json({ error: 'BadRequest', message: 'key requerido' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });

    await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
    audit('delete', { key });
    res.json({ ok: true, key });
  } catch (e) {
    console.error('delete error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- Delete many --------
app.post('/api/deleteMany', async (req, res) => {
  try {
    const { keys } = req.body || {};
    if (!Array.isArray(keys) || !keys.length) return res.status(400).json({ error:'BadRequest' });
    for (const k of keys) {
      if (!within(k, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: k }));
    }
    audit('delete_many', { count: keys.length });
    res.json({ ok:true, count: keys.length });
  } catch (e) {
    console.error('deleteMany error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

// -------- Move / Rename --------
app.post('/api/move', async (req, res) => {
  try {
    const { from, to } = req.body || {};
    if (!from || !to) return res.status(400).json({ error:'BadRequest', message:'from/to requeridos' });
    if (!within(from, req._mixtliToken) || !within(to, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });

    await s3.send(new CopyObjectCommand({
      Bucket: ENV.BUCKET,
      CopySource: `/${ENV.BUCKET}/${encodeURIComponent(from)}`.replace(/%2F/g,'/'),
      Key: to
    }));
    await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: from }));
    audit('move', { from, to });
    res.json({ ok:true, from, to });
  } catch (e) {
    console.error('move error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

app.post('/api/moveMany', async (req, res) => {
  try {
    const { moves } = req.body || {}; // [{from,to},...]
    if (!Array.isArray(moves) || !moves.length) return res.status(400).json({ error:'BadRequest' });
    for (const m of moves) {
      if (!within(m.from, req._mixtliToken) || !within(m.to, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
      await s3.send(new CopyObjectCommand({
        Bucket: ENV.BUCKET,
        CopySource: `/${ENV.BUCKET}/${encodeURIComponent(m.from)}`.replace(/%2F/g,'/'),
        Key: m.to
      }));
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: m.from }));
    }
    audit('move_many', { count: moves.length });
    res.json({ ok:true, count: moves.length });
  } catch (e) {
    console.error('moveMany error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

// -------- HEAD / metadata --------
app.get('/api/head', async (req, res) => {
  try {
    const key = (req.query.key || '').toString();
    if (!key) return res.status(400).json({ error:'BadRequest', message:'key requerido' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });

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

// -------- Multipart Upload --------
app.post('/api/multipart/create', async (req, res) => {
  try {
    const { key, contentType='application/octet-stream' } = req.body || {};
    if (!key) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const out = await s3.send(new CreateMultipartUploadCommand({ Bucket: ENV.BUCKET, Key: key, ContentType: contentType }));
    audit('mpu_create', { key });
    res.json({ uploadId: out.UploadId, key });
  } catch (e) {
    console.error('mpu_create error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

app.post('/api/multipart/partUrl', async (req, res) => {
  try {
    const { key, uploadId, partNumber } = req.body || {};
    if (!key || !uploadId || !partNumber) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const cmd = new UploadPartCommand({ Bucket: ENV.BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
    res.json({ url });
  } catch (e) {
    console.error('mpu_partUrl error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

app.post('/api/multipart/complete', async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body || {}; // parts: [{ETag, PartNumber}]
    if (!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const out = await s3.send(new CompleteMultipartUploadCommand({
      Bucket: ENV.BUCKET, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts }
    }));
    audit('mpu_complete', { key, parts: parts.length });
    res.json({ ok:true, location: out.Location || null, key });
  } catch (e) {
    console.error('mpu_complete error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

app.post('/api/multipart/abort', async (req, res) => {
  try {
    const { key, uploadId } = req.body || {};
    if (!key || !uploadId) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    await s3.send(new AbortMultipartUploadCommand({ Bucket: ENV.BUCKET, Key: key, UploadId: uploadId }));
    audit('mpu_abort', { key });
    res.json({ ok:true });
  } catch (e) {
    console.error('mpu_abort error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API PRO v6 on :${PORT}`));
