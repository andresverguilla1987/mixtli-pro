import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand, GetObjectTaggingCommand, PutObjectTaggingCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';
import { randomUUID } from 'crypto';

// ---- Config ----
const PORT = process.env.PORT || 10000;
const BUCKET = process.env.R2_BUCKET;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT || (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
const FORCE_PATH_STYLE = process.env.R2_FORCE_PATH_STYLE === 'true' ? true : true; // true by default
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE || (ACCOUNT_ID && BUCKET ? `https://${BUCKET}.${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
const PRESIGN_EXPIRES = parseInt(process.env.PRESIGN_EXPIRES || '3600', 10); // seconds
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '50', 10);

// public toggle mode: "tag" (default) or "prefix"
const PUBLIC_TOGGLE_MODE = (process.env.PUBLIC_TOGGLE_MODE || 'tag').toLowerCase();
const PUBLIC_PREFIX = process.env.PUBLIC_PREFIX || '';        // used if mode=prefix (public objects live here)
const PRIVATE_PREFIX = process.env.PRIVATE_PREFIX || '_private/'; // used if mode=prefix (non-public)
const ZIP_MAX_KEYS = parseInt(process.env.ZIP_MAX_KEYS || '2000', 10);

// CORS origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:8080,http://localhost:8080,http://localhost:5173')
  .split(',').map(s=>s.trim()).filter(Boolean);

console.log('[CORS] ALLOWED_ORIGINS (final) =', ALLOWED_ORIGINS);

// ---- Clients ----
const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: FORCE_PATH_STYLE,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }
});

// ---- App ----
const app = express();

// CORS custom handling with whitelist
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if(origin && ALLOWED_ORIGINS.includes(origin)){
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
  res.setHeader('Access-Control-Max-Age', '86400');
  if(req.method === 'OPTIONS'){
    return res.status(204).end();
  }
  next();
});

app.use(bodyParser.json({ limit: '2mb' }));

// ---- Helpers ----
function normalizePrefix(prefix=''){
  if(!prefix) return '';
  return prefix.endsWith('/') ? prefix : prefix + '/';
}
function publicUrlFor(key){
  if(!PUBLIC_BASE) return null;
  const enc = key.split('/').map(encodeURIComponent).join('/');
  return `${PUBLIC_BASE}/${enc}`;
}
function keyFromBody(filename, prefix){
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const pref = normalizePrefix(prefix);
  return `${Date.now()}-${randomUUID().slice(0,12)}-${clean}`.replace(/^/, pref);
}

// Optional: check 'public' tag for object (true/false). Heavy if called for many keys.
async function isPublicByTag(Key){
  try{
    const out = await s3.send(new GetObjectTaggingCommand({ Bucket: BUCKET, Key }));
    const t = (out.TagSet || []).find(x=> x.Key === 'public');
    return t && (t.Value === 'true' || t.Value === '1');
  }catch(e){ return false; }
}

function tryParseInt(n, d=0){ const v = parseInt(n,10); return Number.isFinite(v)? v : d; }

// ---- Routes ----
app.get('/api/health', (req,res)=>{
  res.json({ ok:true, time:new Date().toISOString() });
});

app.get('/api/debug', (req,res)=>{
  const origin = req.headers.origin || null;
  res.json({
    origin,
    allowed: ALLOWED_ORIGINS,
    match: !!(origin && ALLOWED_ORIGINS.includes(origin)),
    request: { method: req.method, path: req.path, headers: {
      host: req.headers.host || null,
      'access-control-request-method': req.headers['access-control-request-method'] || null,
      'access-control-request-headers': req.headers['access-control-request-headers'] || null
    }}
  });
});

// Presign PUT to R2
app.post('/api/presign', async (req,res)=>{
  try{
    const { filename, type, size, prefix } = req.body || {};
    if(!filename) return res.status(400).json({ error:'filename required' });
    if(size && size > MAX_UPLOAD_MB*1024*1024) return res.status(400).json({ error:`Max ${MAX_UPLOAD_MB}MB` });
    const Key = keyFromBody(filename, prefix);
    const put = new PutObjectCommand({ Bucket: BUCKET, Key, ContentType: type || 'application/octet-stream' });
    const url = await getSignedUrl(s3, put, { expiresIn: PRESIGN_EXPIRES });
    const publicUrl = PUBLIC_BASE ? publicUrlFor(Key) : null;
    res.json({ url, key: Key, bucket: BUCKET, publicUrl, expiresIn: PRESIGN_EXPIRES });
  }catch(e){
    console.error('presign error', e);
    res.status(500).json({ error:String(e) });
  }
});

// Complete upload (placeholder for hooks). Return a signed GET too.
app.post('/api/complete', async (req,res)=>{
  try{
    const { key } = req.body || {};
    if(!key) return res.status(400).json({ error:'key required' });
    const get = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3, get, { expiresIn: PRESIGN_EXPIRES });
    res.json({ ok:true, getUrl: url });
  }catch(e){
    console.error('complete error', e);
    res.status(500).json({ error:String(e) });
  }
});

// List assets with optional prefix & pagination
app.get('/api/assets', async (req,res)=>{
  try{
    const prefix = req.query.prefix ? normalizePrefix(req.query.prefix) : '';
    const token = req.query.token || undefined;
    const limit = tryParseInt(req.query.limit, 100);
    const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: Math.min(limit, 1000) }));
    const contents = out.Contents || [];
    // For 'tag' mode, enrich with publicUrl if tag public=true; otherwise, compute publicUrl always if bucket is open.
    const items = [];
    for(const c of contents){
      const key = c.Key;
      let publicUrl = PUBLIC_BASE ? publicUrlFor(key) : null;
      if(PUBLIC_TOGGLE_MODE === 'tag'){
        const pub = await isPublicByTag(key);
        if(!pub) publicUrl = null;
      }else if(PUBLIC_TOGGLE_MODE === 'prefix'){
        if(!key.startsWith(PUBLIC_PREFIX)) publicUrl = null;
      }
      items.push({
        key,
        size: c.Size,
        lastModified: c.LastModified,
        publicUrl
      });
    }
    res.json({ items, nextToken: out.IsTruncated ? out.NextContinuationToken : null });
  }catch(e){
    console.error('assets error', e);
    res.status(500).json({ error:String(e) });
  }
});

// Sign GET (temporary download/view URL)
app.post('/api/sign-get', async (req,res)=>{
  try{
    const { key, download } = req.body || {};
    if(!key) return res.status(400).json({ error:'key required' });
    const get = new GetObjectCommand({ Bucket: BUCKET, Key: key, ...(download ? { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(key.split('/').pop())}"` } : {}) });
    const url = await getSignedUrl(s3, get, { expiresIn: PRESIGN_EXPIRES });
    res.json({ url, expiresIn: PRESIGN_EXPIRES });
  }catch(e){
    console.error('sign-get error', e);
    res.status(500).json({ error:String(e) });
  }
});

// Rename (copy+delete)
app.post('/api/rename', async (req,res)=>{
  try{
    const { fromKey, toKey } = req.body || {};
    if(!fromKey || !toKey) return res.status(400).json({ error:'fromKey & toKey required' });
    await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: `/${BUCKET}/${encodeURIComponent(fromKey)}`, Key: toKey }));
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fromKey }));
    res.json({ ok:true });
  }catch(e){
    console.error('rename error', e);
    res.status(500).json({ error:String(e) });
  }
});

// Delete
app.post('/api/delete', async (req,res)=>{
  try{
    const { key } = req.body || {};
    if(!key) return res.status(400).json({ error:'key required' });
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    res.json({ ok:true });
  }catch(e){
    console.error('delete error', e);
    res.status(500).json({ error:String(e) });
  }
});

// --- NEW: Public toggle ---
// POST /api/public { keys: string[]; public: boolean }
app.post('/api/public', async (req,res)=>{
  try{
    const { keys, public: isPublic } = req.body || {};
    const list = Array.isArray(keys) ? keys : (req.body && req.body.key ? [req.body.key] : []);
    if(list.length===0) return res.status(400).json({ error:'keys[] required' });
    if(PUBLIC_TOGGLE_MODE === 'tag'){
      for(const Key of list){
        await s3.send(new PutObjectTaggingCommand({
          Bucket: BUCKET, Key,
          Tagging: { TagSet: [{ Key:'public', Value: isPublic ? 'true' : 'false' }] }
        }));
      }
      return res.json({ ok:true, mode:'tag' });
    } else if(PUBLIC_TOGGLE_MODE === 'prefix'){
      // Move between PRIVATE_PREFIX and PUBLIC_PREFIX
      for(const fromKey of list){
        const base = fromKey.replace(/^.*\//, s=> s); // keep last segment after / for simple demo
        let dest = fromKey;
        if(isPublic){
          // move to PUBLIC_PREFIX (strip PRIVATE_PREFIX if exists)
          const stripped = fromKey.startsWith(PRIVATE_PREFIX) ? fromKey.slice(PRIVATE_PREFIX.length) : fromKey;
          dest = `${PUBLIC_PREFIX}${stripped}`;
        } else {
          // move to PRIVATE_PREFIX
          const stripped = fromKey.startsWith(PUBLIC_PREFIX) ? fromKey.slice(PUBLIC_PREFIX.length) : fromKey;
          dest = `${PRIVATE_PREFIX}${stripped}`;
        }
        if(dest === fromKey) continue;
        await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: `/${BUCKET}/${encodeURIComponent(fromKey)}`, Key: dest }));
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fromKey }));
      }
      return res.json({ ok:true, mode:'prefix' });
    } else {
      return res.status(400).json({ error:'Unsupported PUBLIC_TOGGLE_MODE' });
    }
  }catch(e){
    console.error('public toggle error', e);
    res.status(500).json({ error:String(e) });
  }
});

// --- NEW: ZIP album ---
// GET /api/zip?prefix=album/
app.get('/api/zip', async (req,res)=>{
  try{
    const prefix = req.query.prefix ? normalizePrefix(req.query.prefix) : '';
    // list objects under prefix
    let token;
    const keys = [];
    do{
      const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
      (out.Contents || []).forEach(o => { if(o.Key && !o.Key.endsWith('/')) keys.push(o.Key); });
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
      if(keys.length >= ZIP_MAX_KEYS) break;
    } while(token);

    if(keys.length === 0) return res.status(404).json({ error:'No files' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent((prefix || 'album').replace(/\/$/,'') || 'album')}.zip"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { try{ res.status(500).end(String(err)); }catch{} });
    archive.pipe(res);

    for(const key of keys){
      const rel = prefix ? key.substring(prefix.length) : key;
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      archive.append(obj.Body, { name: rel || key });
    }
    await archive.finalize();
  }catch(e){
    console.error('zip error', e);
    if(!res.headersSent){
      res.status(500).json({ error:String(e) });
    } else {
      try{ res.end() }catch{}
    }
  }
});

// ---- Start ----
app.listen(PORT, ()=>{
  console.log(`Mixtli API on :${PORT}`);
});
