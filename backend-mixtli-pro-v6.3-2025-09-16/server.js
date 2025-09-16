// server.js — Mixtli API PRO (v6.3)
import express from 'express';
import crypto from 'crypto';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
  ListObjectsV2Command, CopyObjectCommand, HeadObjectCommand,
  CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const pick = (...names) => { for (const n of names){ const v = process.env[n]; if (typeof v === 'string' && v.trim() !== '') return v.trim(); } return ''; };
const parseOrigins = (raw) => {
  if (!raw) return [];
  const eq = raw.indexOf('=');
  if (raw.startsWith('ALLOWED_ORIGINS') && eq !== -1) raw = raw.slice(eq + 1);
  raw = raw.trim();
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : []; } catch {}
  return raw.replace(/^\[\s]*/, '').replace(/[\]\s]*$/, '').split(/[\s,]+/).map(s=>s.trim().replace(/^\"+|\"+$/g,'')).filter(Boolean);
};
const parseJSON = (raw) => { if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };
const b64u = (buf)=> buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

const ENV = {
  ENDPOINT: pick('S3_ENDPOINT'),
  REGION: pick('S3_REGION') || 'auto',
  FORCE_PATH: (pick('S3_FORCE_PATH_STYLE') || 'true').toLowerCase() !== 'false',
  KEY: pick('S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID'),
  SECRET: pick('S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY'),
  BUCKET: pick('S3_BUCKET', 'R2_BUCKET', 'BUCKET'),

  ALLOWED_ORIGINS: parseOrigins(pick('ALLOWED_ORIGINS')),
  API_TOKEN: pick('API_TOKEN'),
  ROOT_PREFIX: pick('ROOT_PREFIX'),
  TOKEN_PREFIX_MAP: parseJSON(pick('TOKEN_PREFIX_MAP')) || {},
  ALLOWED_MIME: (pick('ALLOWED_MIME') || 'image/jpeg,image/png,text/plain,application/pdf').split(',').map(s=>s.trim()).filter(Boolean),

  TRASH_PREFIX: (pick('TRASH_PREFIX') || 'trash/').replace(/^\/+/,''),
  CACHE_PREFIX: (pick('CACHE_PREFIX') || 'cache/').replace(/^\/+/,''),
  CACHE_TTL_DAYS: parseInt(pick('CACHE_TTL_DAYS') || '30', 10),
  LIST_CACHE_TTL_MS: parseInt(pick('LIST_CACHE_TTL_MS') || '60000', 10),

  RATE_LIMIT: parseInt(pick('RATE_LIMIT_PER_MIN') || '120', 10),
  AUDIT: (pick('AUDIT') || '').toLowerCase() === 'true',

  ENABLE_THUMBS: (pick('ENABLE_THUMBS') || 'true').toLowerCase() === 'true',
  SLACK_WEBHOOK_URL: pick('SLACK_WEBHOOK_URL'),

  BACKUP_ENABLED: (pick('BACKUP_ENABLED') || '').toLowerCase() === 'true',
  BACKUP_ENDPOINT: pick('BACKUP_ENDPOINT'),
  BACKUP_BUCKET: pick('BACKUP_BUCKET'),
  BACKUP_REGION: pick('BACKUP_REGION') || 'auto',
  BACKUP_KEY: pick('BACKUP_ACCESS_KEY_ID', 'BACKUP_KEY'),
  BACKUP_SECRET: pick('BACKUP_SECRET_ACCESS_KEY', 'BACKUP_SECRET'),
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
const within = (key, token) => {
  const root = basePrefixForToken(token);
  if (!root) return true;
  const k = key || '';
  return k.startsWith(root) || k.startsWith(ENV.TRASH_PREFIX + root) || k.startsWith(ENV.CACHE_PREFIX + root);
};

const s3 = new S3Client({
  region: ENV.REGION,
  endpoint: ENV.ENDPOINT,
  forcePathStyle: ENV.FORCE_PATH,
  credentials: { accessKeyId: ENV.KEY, secretAccessKey: ENV.SECRET }
});

const s3b = (ENV.BACKUP_ENABLED && ENV.BACKUP_ENDPOINT && ENV.BACKUP_BUCKET && ENV.BACKUP_KEY && ENV.BACKUP_SECRET) ?
  new S3Client({
    region: ENV.BACKUP_REGION,
    endpoint: ENV.BACKUP_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: ENV.BACKUP_KEY, secretAccessKey: ENV.BACKUP_SECRET }
  }) : null;

const now = ()=> new Date().toISOString();
const sha256 = (s)=> crypto.createHash('sha256').update(s).digest('hex');
const newId = ()=> b64u(crypto.randomBytes(16));
const notify = async (text) => {
  if (!ENV.SLACK_WEBHOOK_URL) return;
  try { await fetch(ENV.SLACK_WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) }); } catch {}
};

const app = express();
app.use(express.json({ limit:'50mb' }));

// CORS
app.use((req,res,next)=>{
  const origin = req.headers.origin;
  if (origin && ENV.ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,x-mixtli-token,x-share-password');
  if (req.method==='OPTIONS') return res.status(204).end();
  next();
});

// Auth
app.use((req,res,next)=>{
  if (!ENV.API_TOKEN && !Object.keys(ENV.TOKEN_PREFIX_MAP).length) return next();
  const t = req.headers['x-mixtli-token'];
  const ok = (ENV.API_TOKEN && t===ENV.API_TOKEN) || (!!ENV.TOKEN_PREFIX_MAP[t]);
  if (!ok) return res.status(401).json({ error:'Unauthorized' });
  req._mixtliToken = t;
  next();
});

// Rate limit simple
const buckets = new Map();
setInterval(()=> buckets.clear(), 60_000).unref();
app.use((req,res,next)=>{
  const id = req._mixtliToken || req.ip;
  const count = (buckets.get(id) || 0) + 1;
  buckets.set(id, count);
  if (count > (ENV.RATE_LIMIT || 120)) return res.status(429).json({ error:'TooManyRequests' });
  next();
});

const audit = (evt, extra={}) => { if (ENV.AUDIT) console.log('[AUDIT]', JSON.stringify({ evt, time: now(), ...extra })); };

app.get('/', (_req,res)=> res.status(200).send('OK'));
app.get('/salud', (_req,res)=> res.json({ ok:true, time: now() }));

// List cache
const listCache = new Map();
const keyListCache = (prefix, token) => `${token||''}|${prefix||''}`;
const setListCache = (k,data)=> listCache.set(k,{ data, exp: Date.now() + (parseInt(ENV.LIST_CACHE_TTL_MS)||60000) });
const getListCache = (k)=>{ const v=listCache.get(k); if(!v) return null; if(Date.now()>v.exp){ listCache.delete(k); return null; } return v.data; };
const invalidateAllLists = ()=> listCache.clear();

// Presign
app.post('/api/presign', async (req,res)=>{
  try {
    const { key, contentType='application/octet-stream', method='PUT', expiresIn=300, filename } = req.body || {};
    if (!key) return res.status(400).json({ error:'BadRequest', message:'key requerido' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });

    if (method==='PUT'){
      if (ENV.ALLOWED_MIME.length && contentType && !ENV.ALLOWED_MIME.includes(contentType)) {
        return res.status(400).json({ error:'BadRequest', message:'tipo no permitido' });
      }
      const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: ENV.BUCKET, Key: key, ContentType: contentType }), { expiresIn });
      audit('presign_put', { key }); return res.json({ url, key, method:'PUT', expiresIn });
    } else if (method==='GET'){
      const cmd = new GetObjectCommand({ Bucket: ENV.BUCKET, Key: key, ...(filename? { ResponseContentDisposition:`attachment; filename="${filename}"` } : {}) });
      const url = await getSignedUrl(s3, cmd, { expiresIn });
      audit('presign_get', { key }); return res.json({ url, key, method:'GET', expiresIn });
    }
    res.status(400).json({ error:'BadRequest' });
  } catch(e){ console.error('presign', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// List
app.get('/api/list', async (req,res)=>{
  try{
    const prefix = (req.query.prefix||'').toString();
    if (!within(prefix, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const MaxKeys = Math.min(parseInt(req.query.limit||'50',10), 1000);
    const ContinuationToken = req.query.token ? decodeURIComponent(req.query.token.toString()) : undefined;
    const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: prefix || undefined, MaxKeys, ContinuationToken }));
    audit('list', { prefix, count: (out.Contents||[]).length });
    res.json({ items: (out.Contents||[]).map(o=>({ key:o.Key, size:o.Size, lastModified:o.LastModified })), nextToken: out.IsTruncated ? encodeURIComponent(out.NextContinuationToken) : null });
  } catch(e){ console.error('list', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

app.get('/api/list2', async (req,res)=>{
  try{
    const prefix = (req.query.prefix||'').toString();
    if (!within(prefix, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const MaxKeys = Math.min(parseInt(req.query.limit||'100',10), 1000);
    const ContinuationToken = req.query.token ? decodeURIComponent(req.query.token.toString()) : undefined;

    const cacheKey = keyListCache(prefix, req._mixtliToken) + '|' + (ContinuationToken||'');
    const cached = getListCache(cacheKey);
    if (cached) return res.json(cached);

    const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: prefix || undefined, MaxKeys, ContinuationToken, Delimiter:'/' }));
    const data = {
      folders: (out.CommonPrefixes||[]).map(p=>p.Prefix),
      items: (out.Contents||[]).filter(o=>o.Key !== prefix).map(o=>({ key:o.Key, size:o.Size, lastModified:o.LastModified })),
      nextToken: out.IsTruncated ? encodeURIComponent(out.NextContinuationToken) : null
    };
    setListCache(cacheKey, data);
    audit('list2', { prefix, count: data.items.length, folders:data.folders.length });
    res.json(data);
  } catch(e){ console.error('list2', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Folder
app.post('/api/folder', async (req,res)=>{
  try{
    let { prefix } = req.body || {}; if(!prefix) return res.status(400).json({ error:'BadRequest' });
    if (!prefix.endsWith('/')) prefix += '/';
    if (!within(prefix, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    await s3.send(new PutObjectCommand({ Bucket: ENV.BUCKET, Key: prefix, Body:'' }));
    invalidateAllLists(); await notify(`📁 Carpeta: ${prefix}`);
    res.json({ ok:true, prefix });
  } catch(e){ console.error('folder', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Delete -> Trash
app.delete('/api/object', async (req,res)=>{
  try{
    const key = (req.query.key||'').toString(); const hard = (req.query.hard||'')==='1';
    if (!key) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });

    if (hard || key.startsWith(ENV.TRASH_PREFIX)) {
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
      await notify(`🗑️ Hard delete: ${key}`);
    } else {
      const to = ENV.TRASH_PREFIX + key;
      await s3.send(new CopyObjectCommand({ Bucket: ENV.BUCKET, CopySource:`/${ENV.BUCKET}/${encodeURIComponent(key)}`.replace(/%2F/g,'/'), Key: to }));
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
      await notify(`♻️ Trash move: ${key} → ${to}`);
    }
    invalidateAllLists();
    res.json({ ok:true });
  } catch(e){ console.error('delete', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

app.post('/api/trash/restore', async (req,res)=>{
  try{
    const { keys } = req.body || {}; if (!Array.isArray(keys) || !keys.length) return res.status(400).json({ error:'BadRequest' });
    for (const k of keys){
      if (!k.startsWith(ENV.TRASH_PREFIX)) return res.status(400).json({ error:'BadRequest' });
      const to = k.substring(ENV.TRASH_PREFIX.length);
      if (!within(k, req._mixtliToken) || !within(to, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
      await s3.send(new CopyObjectCommand({ Bucket: ENV.BUCKET, CopySource:`/${ENV.BUCKET}/${encodeURIComponent(k)}`.replace(/%2F/g,'/'), Key: to }));
      await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: k }));
    }
    invalidateAllLists(); await notify(`↩️ Trash restore: ${keys.length}`);
    res.json({ ok:true, count: keys.length });
  } catch(e){ console.error('trash_restore', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

app.post('/api/trash/empty', async (req,res)=>{
  try{
    const { prefix = '' } = req.body || {};
    const root = (ENV.TOKEN_PREFIX_MAP[req._mixtliToken] || ENV.ROOT_PREFIX || '');
    const full = ENV.TRASH_PREFIX + root + prefix;
    let token; let count=0;
    do{
      const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: full, ContinuationToken: token }));
      for (const o of (out.Contents||[])){ await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: o.Key })); count++; }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while(token);
    invalidateAllLists(); await notify(`🧹 Trash empty (${count})`);
    res.json({ ok:true, count });
  } catch(e){ console.error('trash_empty', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Move / Rename
app.post('/api/move', async (req,res)=>{
  try{
    const { from, to } = req.body || {}; if(!from||!to) return res.status(400).json({ error:'BadRequest' });
    if (!within(from, req._mixtliToken) || !within(to, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    await s3.send(new CopyObjectCommand({ Bucket: ENV.BUCKET, CopySource:`/${ENV.BUCKET}/${encodeURIComponent(from)}`.replace(/%2F/g,'/'), Key: to }));
    await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: from }));
    invalidateAllLists(); await notify(`📦 Move: ${from} → ${to}`);
    res.json({ ok:true });
  } catch(e){ console.error('move', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

app.get('/api/head', async (req,res)=>{
  try{
    const key = (req.query.key||'').toString(); if(!key) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const out = await s3.send(new HeadObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
    res.json({ key, size: out.ContentLength, contentType: out.ContentType, lastModified: out.LastModified });
  } catch(e){ console.error('head', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Multipart
app.post('/api/multipart/create', async (req,res)=>{
  try{ const { key, contentType='application/octet-stream' } = req.body || {};
    if (!key) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const out = await s3.send(new CreateMultipartUploadCommand({ Bucket: ENV.BUCKET, Key: key, ContentType: contentType }));
    res.json({ uploadId: out.UploadId, key });
  } catch(e){ console.error('mpu_create', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});
app.post('/api/multipart/partUrl', async (req,res)=>{
  try{ const { key, uploadId, partNumber } = req.body || {};
    if (!key || !uploadId || !partNumber) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const url = await getSignedUrl(s3, new UploadPartCommand({ Bucket: ENV.BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }), { expiresIn:3600 });
    res.json({ url });
  } catch(e){ console.error('mpu_part', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});
app.post('/api/multipart/complete', async (req,res)=>{
  try{ const { key, uploadId, parts } = req.body || {};
    if (!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const out = await s3.send(new CompleteMultipartUploadCommand({ Bucket: ENV.BUCKET, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
    invalidateAllLists(); res.json({ ok:true, location: out.Location || null, key });
  } catch(e){ console.error('mpu_complete', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});
app.post('/api/multipart/abort', async (req,res)=>{
  try{ const { key, uploadId } = req.body || {};
    if (!key || !uploadId) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    await s3.send(new AbortMultipartUploadCommand({ Bucket: ENV.BUCKET, Key: key, UploadId: uploadId }));
    res.json({ ok:true });
  } catch(e){ console.error('mpu_abort', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Cleanup
app.post('/api/cleanup', async (req,res)=>{
  try{
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
    invalidateAllLists(); await notify(`🧽 Cleanup cache: ${deleted}`);
    res.json({ ok:true, deleted });
  } catch(e){ console.error('cleanup', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Shares
const sharePath = (id)=> `${ENV.CACHE_PREFIX}shares/${id}.json`;
const shareOwnerRoot = (token)=> basePrefixForToken(token)||'';

app.post('/api/share/create', async (req,res)=>{
  try{
    const { key, expiresSec=1800, password='', maxDownloads=0 } = req.body || {};
    if (!key) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const id = b64u(crypto.randomBytes(16));
    const data = {
      id, key, ownerRoot: shareOwnerRoot(req._mixtliToken),
      expAt: Date.now() + (Math.max(60, parseInt(expiresSec,10))*1000),
      createdAt: now(),
      passwordHash: password ? sha256(password) : null,
      maxDownloads: Math.max(0, parseInt(maxDownloads,10)||0),
      downloads: 0
    };
    await s3.send(new PutObjectCommand({ Bucket: ENV.BUCKET, Key: sharePath(id), ContentType:'application/json', Body: JSON.stringify(data) }));
    await notify(`🔗 Share creado ${id} para ${key}`);
    res.json({ ok:true, id });
  } catch(e){ console.error('share_create', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

app.get('/api/share/:id', async (req,res)=>{
  try{
    const { id } = req.params;
    const pwd = (req.query.pw || req.headers['x-share-password'] || '').toString();
    const obj = await s3.send(new GetObjectCommand({ Bucket: ENV.BUCKET, Key: sharePath(id) }));
    const body = await new Response(obj.Body).text();
    const data = JSON.parse(body);

    if (Date.now() > data.expAt) return res.status(410).json({ error:'Expired' });
    if (data.passwordHash){
      if (!pwd) return res.status(401).json({ error:'PASSWORD_REQUIRED' });
      if (sha256(pwd) !== data.passwordHash) return res.status(403).json({ error:'BadPassword' });
    }
    if (data.maxDownloads && data.downloads >= data.maxDownloads) return res.status(429).json({ error:'MaxDownloads' });

    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: ENV.BUCKET, Key: data.key }), { expiresIn: 180 });
    data.downloads = (data.downloads||0) + 1;
    await s3.send(new PutObjectCommand({ Bucket: ENV.BUCKET, Key: sharePath(id), ContentType:'application/json', Body: JSON.stringify(data) }));
    res.json({ ok:true, url, file: data.key, expAt: data.expAt, downloads: data.downloads, max: data.maxDownloads||0 });
  } catch(e){ console.error('share_get', e); res.status(404).json({ error:'NotFound' }); }
});

app.get('/api/share/list', async (req,res)=>{
  try{
    const root = shareOwnerRoot(req._mixtliToken);
    const Prefix = `${ENV.CACHE_PREFIX}shares/`;
    let token; const rows=[];
    do{
      const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix, ContinuationToken: token }));
      for (const o of (out.Contents||[])){
        const r = await s3.send(new GetObjectCommand({ Bucket: ENV.BUCKET, Key: o.Key }));
        const txt = await new Response(r.Body).text(); const d = JSON.parse(txt);
        if (d.ownerRoot === root) rows.push(d);
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while(token);
    rows.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
    res.json({ ok:true, items: rows });
  } catch(e){ console.error('share_list', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

app.post('/api/share/revoke', async (req,res)=>{
  try{ const { id } = req.body || {}; if(!id) return res.status(400).json({ error:'BadRequest' });
    await s3.send(new DeleteObjectCommand({ Bucket: ENV.BUCKET, Key: sharePath(id) }));
    await notify(`⛔ Share revocado ${id}`);
    res.json({ ok:true });
  } catch(e){ console.error('share_revoke', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Stats
const usagePath = (root)=> `${ENV.CACHE_PREFIX}usage/${sha256(root||'__root__')}.json`;
async function calcUsage(root){
  const base = root || '';
  let token; let totalBytes=0, totalObjects=0;
  do {
    const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: base, ContinuationToken: token }));
    for (const o of (out.Contents||[])){
      const k = o.Key || '';
      if (k.startsWith(ENV.TRASH_PREFIX) || k.startsWith(ENV.CACHE_PREFIX)) continue;
      totalBytes += o.Size || 0; totalObjects += 1;
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while(token);
  return { totalBytes, totalObjects, updatedAt: now() };
}
app.get('/api/stats', async (req,res)=>{
  try{
    const root = basePrefixForToken(req._mixtliToken) || '';
    let data;
    try{ const r = await s3.send(new GetObjectCommand({ Bucket: ENV.BUCKET, Key: usagePath(root) })); data = JSON.parse(await new Response(r.Body).text()); } catch {}
    const stale = !data || (Date.now() - new Date(data.updatedAt||0).getTime() > 3600_000);
    if (stale){ data = await calcUsage(root); await s3.send(new PutObjectCommand({ Bucket: ENV.BUCKET, Key: usagePath(root), ContentType:'application/json', Body: JSON.stringify(data) })); }
    res.json({ ok:true, ...data });
  } catch(e){ console.error('stats', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});
app.post('/api/stats/recalc', async (req,res)=>{
  try{
    const root = basePrefixForToken(req._mixtliToken) || '';
    const data = await calcUsage(root);
    await s3.send(new PutObjectCommand({ Bucket: ENV.BUCKET, Key: usagePath(root), ContentType:'application/json', Body: JSON.stringify(data) }));
    await notify(`📊 Stats: ${data.totalObjects} objetos, ${data.totalBytes} bytes`);
    res.json({ ok:true, ...data });
  } catch(e){ console.error('stats_recalc', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Backup
app.post('/api/backup/run', async (req,res)=>{
  try{
    if (!s3b) return res.status(400).json({ error:'BackupDisabled' });
    const root = basePrefixForToken(req._mixtliToken) || '';
    const { token:inTok, limit=500 } = req.body || {};
    let token = inTok; let copied=0;
    do {
      const out = await s3.send(new ListObjectsV2Command({ Bucket: ENV.BUCKET, Prefix: root, ContinuationToken: token, MaxKeys: Math.min(parseInt(limit,10)||500,1000) }));
      for (const o of (out.Contents||[])){
        const k = o.Key || '';
        if (k.startsWith(ENV.TRASH_PREFIX) || k.startsWith(ENV.CACHE_PREFIX)) continue;
        await s3b.send(new CopyObjectCommand({ Bucket: ENV.BACKUP_BUCKET, CopySource:`/${ENV.BUCKET}/${encodeURIComponent(k)}`.replace(/%2F/g,'/'), Key: k }));
        copied++;
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token && copied < (parseInt(limit,10)||500));
    await notify(`🔁 Backup copiados: ${copied}`);
    res.json({ ok:true, copied, nextToken: token || null });
  } catch(e){ console.error('backup', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

// Thumbs on-demand
async function ensureSharp(){ if (!ENV.ENABLE_THUMBS) return null; try{ const mod = await import('sharp'); return mod.default || mod; } catch { return null; } }
app.get('/api/thumb', async (req,res)=>{
  try{
    const key = (req.query.key||'').toString();
    const w = Math.max(32, Math.min(1024, parseInt((req.query.w||'256'),10)));
    if (!key) return res.status(400).json({ error:'BadRequest' });
    if (!within(key, req._mixtliToken)) return res.status(403).json({ error:'Forbidden' });
    const ext = (key.split('.').pop()||'').toLowerCase();
    const isImg = ['jpg','jpeg','png','webp','gif','avif'].includes(ext);
    if (!isImg) return res.status(400).json({ error:'NotImage' });

    const thumbKey = `${ENV.CACHE_PREFIX}thumbs/${key}.jpg`;
    try { const t = await s3.send(new GetObjectCommand({ Bucket: ENV.BUCKET, Key: thumbKey })); res.setHeader('Content-Type','image/jpeg'); return t.Body.pipe(res); } catch {}

    const sharp = await ensureSharp(); if (!sharp) return res.status(501).json({ error:'ThumbsDisabled' });
    const obj = await s3.send(new GetObjectCommand({ Bucket: ENV.BUCKET, Key: key }));
    const buf = Buffer.from(await new Response(obj.Body).arrayBuffer());
    const out = await sharp(buf).resize({ width:w }).jpeg({ quality:78 }).toBuffer();
    await s3.send(new PutObjectCommand({ Bucket: ENV.BUCKET, Key: thumbKey, Body: out, ContentType:'image/jpeg' }));
    res.setHeader('Content-Type','image/jpeg'); res.send(out);
  } catch(e){ console.error('thumb', e); res.status(500).json({ error:'ServerError', message:e.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`Mixtli API PRO v6.3 on :${PORT}`));
