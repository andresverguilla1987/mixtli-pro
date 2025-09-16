// server.js — Mixtli API PRO (v6.2)
// Novedades vs v6:
// - Papelera real: DELETE mueve a TRASH_PREFIX/, hard delete con ?hard=1
// - Endpoints de papelera: /api/trash/restore, /api/trash/empty
// - Limpieza de caché/app: /api/cleanup para CACHE_PREFIX con TTL por días
// - Cache in-memory de list2 (TTL ms) e invalidación al mutar
//
// Requiere Node 18+, ESM ("type":"module")

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

// ---------- Helpers de ENV ----------
const pick = (...names) => {
  for (const n of names) { const v = process.env[n]; if (typeof v === 'string' && v.trim() !== '') return v.trim(); }
  return '';
};
const parseOrigins = (raw) => {
  if (!raw) return [];
  const eq = raw.indexOf('=');
  if (raw.startsWith('ALLOWED_ORIGINS') && eq !== -1) raw = raw.slice(eq + 1);
  raw = raw.trim();
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : []; } catch {}
  return raw.replace(/^\[\s]*/, '').replace(/[\]\s]*$/, '').split(/[\s,]+/).map(s=>s.trim().replace(/^\"+|\"+$/g,'')).filter(Boolean);
};
const parseJSON = (raw) => { if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };

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
  ROOT_PREFIX: pick('ROOT_PREFIX'),
  TOKEN_PREFIX_MAP: parseJSON(pick('TOKEN_PREFIX_MAP')) || {},
  RATE_LIMIT: parseInt(pick('RATE_LIMIT_PER_MIN') || '120', 10),
  AUDIT: (pick('AUDIT') || '').toLowerCase() === 'true',

  // v6.2
  TRASH_PREFIX: (pick('TRASH_PREFIX') || 'trash/').replace(/^\/+/,''),
  CACHE_PREFIX: (pick('CACHE_PREFIX') || 'cache/').replace(/^\/+/,''),
  CACHE_TTL_DAYS: parseInt(pick('CACHE_TTL_DAYS') || '30', 10),
  LIST_CACHE_TTL_MS: parseInt(pick('LIST_CACHE_TTL_MS') || '60000', 10),
};

if (ENV.ENDPOINT && ENV.BUCKET && /\/[^/]+\/?$/.test(ENV.ENDPOINT)) {
  const tail = ENV.ENDPOINT.substring(ENV.ENDPOINT.lastIndexOf('/')+1).replace(/\/$/, '');
  if (tail === ENV.BUCKET) ENV.ENDPOINT = ENV.ENDPOINT.replace(/\/+[^/]+\/?$/, '');
}
if (!ENV.ENDPOINT) throw new Error('ConfigError: S3_ENDPOINT no está definido');
if (!ENV.BUCKET)  throw new Error('ConfigError: S3_BUCKET/R2_BUCKET/BUCKET no está definido');
if (!ENV.KEY)     throw new Error('ConfigError: S3_ACCESS_KEY_ID no está definido');
if (!ENV.SECRET)  throw new Error('ConfigError: S3_SECRET_ACCESS_KEY no está definido');

const basePrefixForToken = (token) => (ENV.TOKEN_PREFIX_MAP[token] || ENV.ROOT_PREFIX || '');

// Permite claves dentro de root, trash/root, cache/root
const within = (key, token) => {
  const root = basePrefixForToken(token);
  if (!root) return true;
  const k = key || '';
  return k.startsWith(root) || k.startsWith(ENV.TRASH_PREFIX + root) || k.startsWith(ENV.CACHE_PREFIX + root);
};

// ---------- S3 client ----------
const s3 = new S3Client({
  region: ENV.REGION,
  endpoint: ENV.ENDPOINT,
  forcePathStyle: ENV.FORCE_PATH,
  credentials: { accessKeyId: ENV.KEY, secretAccessKey: ENV.SECRET }
});

// ---------- App ----------
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

// Auth (único token o mapa)
app.use((req, res, next) => {
  if (!ENV.API_TOKEN && !Object.keys(ENV.TOKEN_PREFIX_MAP).length) return next();
  const t = req.headers['x-mixtli-token'];
  const ok = (ENV.API_TOKEN && t===ENV.API_TOKEN) || (!!ENV.TOKEN_PREFIX_MAP[t]);
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });
  req._mixtliToken = t;
  next();
});

// Rate limit básico
const buckets = new Map();
setInterval(()=> buckets.clear(), 60_000).unref();
app.use((req, res, next) => {
  const id = req._mixtliToken || req.ip;
  const count = (buckets.get(id) || 0) + 1;
  buckets.set(id, count);
  if (count > (ENV.RATE_LIMIT || 120)) return res.status(429).json({ error: 'TooManyRequests' });
  next();
});

const audit = (evt, extra={}) => { if (ENV.AUDIT) console.log('[AUDIT]', JSON.stringify({evt, time:new Date().toISOString(), ...extra})); };

app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/salud', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/_envcheck', (req, res) => {
  const root = basePrefixForToken(req._mixtliToken);
  res.json({
    S3_BUCKET: ENV.BUCKET,
    ENDPOINT: !!ENV.ENDPOINT,
    REGION: ENV.REGION,
    ROOT_PREFIX: root || null,
    TRASH_PREFIX: ENV.TRASH_PREFIX,
    CACHE_PREFIX: ENV.CACHE_PREFIX
  });
});

// ----------- Cache de list2 -----------
const listCache = new Map(); // key -> {data, exp}
const keyListCache = (prefix, token) => `${token||''}|${prefix||''}`;
const setListCache = (k, data) => listCache.set(k, { data, exp: Date.now() + ENV.LIST_CACHE_TTL_MS });
const getListCache = (k) => {
  const v = listCache.get(k);
  if (!v) return null;
  if (Date.now() > v.exp) { listCache.delete(k); return null; }
  return v.data;
};
const invalidateAllLists = () => listCache.clear();

// -------- Presign --------
app.post('/api/presign', async (req, res) => {
  try {
    const { key, contentType = 'application/octet-stream', method = 'PUT', expiresIn = 300, filename } = req.body || {};
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'BadRequest', message: 'key requerido' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });

    if (method === 'PUT') {
      if (ENV.ALLOWED_MIME.length && contentType && !ENV.ALLOWED_MIME.includes(contentType)) {
        return res.status(400).json({ error: 'BadRequest', message: 'tipo no permitido' });
      }
      const cmd = new PutObjectCommand({ Bucket: ENV.BUCKET, Key: key, ContentType: contentType });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      audit('presign_put', { key });
      res.json({ url, key, method: 'PUT', expiresIn });
    } else if (method === 'GET') {
      const cmd = new GetObjectCommand({
        Bucket: ENV.BUCKET,
        Key: key,
        ...(filename ? { ResponseContentDisposition: `attachment; filename="${filename}"` } : {})
      });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      audit('presign_get', { key });
      res.json({ url, key, method: 'GET', expiresIn });
    } else {
      res.status(400).json({ error: 'BadRequest', message: 'método soportado: PUT o GET' });
    }
  } catch (e) {
    console.error('presign error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- List simple --------
app.get('/api/list', async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    if (!within(prefix, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
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

// -------- List con carpetas + cache --------
app.get('/api/list2', async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    if (!within(prefix, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const MaxKeys = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    const ContinuationToken = req.query.token ? decodeURIComponent(req.query.token.toString()) : undefined;

    const cacheKey = keyListCache(prefix, req._mixtliToken) + '|' + (ContinuationToken||'');
    const cached = getListCache(cacheKey);
    if (cached) return res.json(cached);

    const out = await s3.send(new ListObjectsV2Command({
      Bucket: ENV.BUCKET, Prefix: prefix || undefined, MaxKeys, ContinuationToken, Delimiter: '/'
    }));
    const data = {
      folders: (out.CommonPrefixes || []).map(p => p.Prefix),
      items: (out.Contents || []).filter(o => o.Key !== prefix).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified })),
      nextToken: out.IsTruncated ? encodeURIComponent(out.NextContinuationToken) : null
    };
    setListCache(cacheKey, data);
    audit('list2', { prefix, count: data.items.length, folders: data.folders.length });
    res.json(data);
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
    await s3.send(new PutObjectCommand({ Bucket: ENV.BUCKET, Key: prefix, Body: '' }));
    invalidateAllLists();
    audit('folder_create', { prefix });
    res.json({ ok:true, prefix });
  } catch (e) {
    console.error('folder error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

// -------- Delete (mueve a papelera) --------
app.delete('/api/object', async (req, res) => {
  try {
    const key = (req.query.key || '').toString();
    const hard = (req.query.hard || '') === '1';
    if (!key) return res.status(400).json({ error: 'BadRequest', message: 'key requerido' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });

    if (hard || key.startsWith(ENV.TRASH_PREFIX)) {
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
      audit('delete_hard', { key });
    } else {
      const to = ENV.TRASH_PREFIX + key;
      await s3.send(new CopyObjectCommand({
        Bucket: ENV.BUCKET, CopySource: `/${ENV.BUCKET}/${encodeURIComponent(key)}`.replace(/%2F/g,'/'), Key: to
      }));
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
      audit('trash_move', { from: key, to });
    }
    invalidateAllLists();
    res.json({ ok: true, key });
  } catch (e) {
    console.error('delete error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

// -------- Trash restore / empty --------
app.post('/api/trash/restore', async (req, res) => {
  try {
    const { keys } = req.body || {};
    if (!Array.isArray(keys) || !keys.length) return res.status(400).json({ error:'BadRequest' });
    for (const k of keys) {
      if (!k.startsWith(ENV.TRASH_PREFIX)) return res.status(400).json({ error:'BadRequest', message:'clave no es de papelera' });
      const to = k.substring(ENV.TRASH_PREFIX.length);
      if (!within(k, req._mixtliToken) || !within(to, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
      await s3.send(new CopyObjectCommand({
        Bucket: ENV.BUCKET, CopySource: `/${ENV.BUCKET}/${encodeURIComponent(k)}`.replace(/%2F/g,'/'), Key: to
      }));
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: k }));
    }
    invalidateAllLists();
    audit('trash_restore', { count: keys.length });
    res.json({ ok:true, count: keys.length });
  } catch (e) {
    console.error('trash_restore error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

app.post('/api/trash/empty', async (req, res) => {
  try {
    const { prefix = '' } = req.body || {};
    const root = basePrefixForToken(req._mixtliToken) || '';
    const full = ENV.TRASH_PREFIX + root + prefix;
    // listar y borrar todo bajo full
    let token;
    let count = 0;
    do {
      const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: full, ContinuationToken: token }));
      const items = (out.Contents || []);
      for (const o of items) {
        await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: o.Key }));
        count++;
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token);
    invalidateAllLists();
    audit('trash_empty', { prefix: full, count });
    res.json({ ok:true, count });
  } catch (e) {
    console.error('trash_empty error:', e);
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
    invalidateAllLists();
    audit('move', { from, to });
    res.json({ ok:true, from, to });
  } catch (e) {
    console.error('move error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

app.post('/api/moveMany', async (req, res) => {
  try {
    const { moves } = req.body || {};
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
    invalidateAllLists();
    audit('move_many', { count: moves.length });
    res.json({ ok:true, count: moves.length });
  } catch (e) {
    console.error('moveMany error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

// -------- HEAD --------
app.get('/api/head', async (req, res) => {
  try {
    const key = (req.query.key || '').toString();
    if (!key) return res.status(400).json({ error:'BadRequest', message:'key requerido' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const out = await s3.send(new HeadObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
    res.json({ key, size: out.ContentLength, contentType: out.ContentType, lastModified: out.LastModified });
  } catch (e) {
    console.error('head error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

// -------- Multipart --------
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
    const { key, uploadId, parts } = req.body || {};
    if (!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const out = await s3.send(new CompleteMultipartUploadCommand({ Bucket: ENV.BUCKET, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
    invalidateAllLists();
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
    res.json({ ok:true });
  } catch (e) {
    console.error('mpu_abort error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

// -------- Limpieza de CACHE_PREFIX por TTL --------
app.post('/api/cleanup', async (req, res) => {
  try {
    const days = ENV.CACHE_TTL_DAYS;
    const root = basePrefixForToken(req._mixtliToken) || '';
    const base = ENV.CACHE_PREFIX + root;
    const cutoff = Date.now() - (days*24*60*60*1000);
    let token; let deleted=0;
    do {
      const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: base, ContinuationToken: token }));
      for (const o of (out.Contents || [])) {
        if (new Date(o.LastModified).getTime() < cutoff) {
          await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: o.Key }));
          deleted++;
        }
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token);
    invalidateAllLists();
    audit('cleanup', { deleted, base, days });
    res.json({ ok:true, deleted });
  } catch (e) {
    console.error('cleanup error:', e);
    res.status(500).json({ error:'ServerError', message:e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API PRO v6.2 on :${PORT}`));
