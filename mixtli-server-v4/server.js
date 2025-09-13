import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Archiver from 'archiver';
import mime from 'mime-types';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

// CORS strict por lista
function parseOrigins(str) {
  if(!str) return [];
  return str.split(',').map(s=>s.trim()).filter(Boolean);
}
const ALLOWED_ORIGINS = parseOrigins(process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '');
app.use(cors({
  origin: function(origin, cb){
    if(!origin) return cb(null, true);
    const ok = ALLOWED_ORIGINS.includes(origin);
    if(!ok) {
      console.error('[CORS] Rechazado:', { origin, normalized: origin, ALLOWED: ALLOWED_ORIGINS });
      return cb(new Error(`CORS not allowed: ${origin}`));
    }
    cb(null, true);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','x-mixtli-pin']
}));

// PIN para endpoints mutantes
const ADMIN_PIN = process.env.ADMIN_PIN || '';
function requirePin(req, res, next){
  if(!ADMIN_PIN) return next();
  const pin = req.header('x-mixtli-pin') || req.query.pin;
  if(pin === ADMIN_PIN) return next();
  return res.status(401).json({ error: 'PIN requerido' });
}

// R2/S3 setup
const R2_BUCKET   = process.env.R2_BUCKET;
const ACCOUNT_ID  = process.env.R2_ACCOUNT_ID;
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE || '';
const THUMBS_PREFIX = process.env.THUMBS_PREFIX || '__thumbs__/';
const SHARES_PREFIX = process.env.SHARES_PREFIX || '__shares__/';
const META_PREFIX   = process.env.META_PREFIX || '__meta__/';
const PUBLIC_PREFIX = process.env.PUBLIC_PREFIX || 'public/';
const PRIVATE_PREFIX = process.env.PRIVATE_PREFIX || '_private/';
const TRASH_PREFIX  = process.env.TRASH_PREFIX || '_trash/';
const THUMBS_AUTO   = (process.env.THUMBS_AUTO || 'true') === 'true';
const ZIP_MAX_KEYS  = parseInt(process.env.ZIP_MAX_KEYS || '2000', 10);

function s3() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY }
  });
}
function isImageKey(key){
  const e=(key.split('.').pop()||'').toLowerCase();
  return ['jpg','jpeg','png','webp','gif','avif','bmp'].includes(e);
}
function isVideoKey(key){
  const e=(key.split('.').pop()||'').toLowerCase();
  return ['mp4','mov','webm','mkv','avi'].includes(e);
}
function isPdfKey(key){ return (key.split('.').pop()||'').toLowerCase()==='pdf'; }

// Utils
app.get('/api/health', (req,res)=> res.json({ ok:true, time:new Date().toISOString() }));
app.get('/api/debug', (req,res)=>{
  const origin = req.headers.origin || null;
  res.json({
    origin,
    normalized: origin,
    allowed: ALLOWED_ORIGINS,
    match: origin ? ALLOWED_ORIGINS.includes(origin) : true,
    request: {
      method: req.method,
      path: req.path,
      headers: {
        host: req.headers.host || null,
        'access-control-request-method': req.headers['access-control-request-method']||null,
        'access-control-request-headers': req.headers['access-control-request-headers']||null
      }
    }
  });
});

// Sign GET (generic)
app.post('/api/sign-get', async (req,res)=>{
  const { key, expiresIn = 3600 } = req.body||{};
  if(!key) return res.status(400).json({ error:'key requerido' });
  const client = s3();
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket:R2_BUCKET, Key:key }), { expiresIn });
  res.json({ url });
});

// List assets
app.get('/api/assets', async (req,res)=>{
  const prefix = req.query.prefix || '';
  const token = req.query.token || undefined;
  const client=s3();
  const out={ items:[], nextToken:null };
  const r = await client.send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
  out.nextToken = r.IsTruncated ? r.NextContinuationToken : null;
  for(const o of (r.Contents||[])){
    if(o.Key.endsWith('/')) continue;
    // best-effort thumb
    const tKey = `${THUMBS_PREFIX}${o.Key}.jpg`;
    let thumbPublicUrl = null;
    try{
      await client.send(new HeadObjectCommand({ Bucket:R2_BUCKET, Key: tKey }));
      if(o.Key.startsWith(PUBLIC_PREFIX) && R2_PUBLIC_BASE){
        thumbPublicUrl = `${R2_PUBLIC_BASE}/${tKey}`;
      }
    }catch{}
    let publicUrl = null;
    if(o.Key.startsWith(PUBLIC_PREFIX) && R2_PUBLIC_BASE){
      publicUrl = `${R2_PUBLIC_BASE}/${o.Key}`;
    }
    out.items.push({
      key: o.Key, size:o.Size||0, lastModified:o.LastModified||null,
      publicUrl, thumbPublicUrl
    });
  }
  res.json(out);
});

// Albums (group by first folder after base)
app.get('/api/albums', async (req,res)=>{
  const base = (req.query.base || PUBLIC_PREFIX);
  const client=s3();
  const seen = new Map();
  let token=undefined; let loops=0;
  while(loops<50){
    loops++;
    const r = await client.send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: base, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      const key=o.Key;
      if(!key.startsWith(base)) continue;
      const rest = key.substring(base.length);
      const m = rest.split('/')[0];
      if(!m) continue;
      const prefix = `${base}${m}/`;
      if(!seen.has(prefix)) seen.set(prefix, { prefix, name:m, count:0, totalSize:0, coverKey:null, coverPublicUrl:null });
      const it = seen.get(prefix);
      if(!key.endsWith('/')){ it.count++; it.totalSize += (o.Size||0); }
    }
    if(!token) break;
  }
  // cover: try __meta__/prefix/.mixtli-cover.json
  for(const [prefix, it] of seen){
    try{
      const metaKey = `${META_PREFIX}${prefix}.mixtli-cover.json`;
      const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key: metaKey }));
      const buf = await obj.Body.transformToByteArray();
      const j = JSON.parse(Buffer.from(buf).toString('utf8'));
      it.coverKey = j.coverKey || null;
      if(it.coverKey && it.coverKey.startsWith(PUBLIC_PREFIX) && R2_PUBLIC_BASE){
        it.coverPublicUrl = `${R2_PUBLIC_BASE}/${it.coverKey}`;
      }
    }catch{}
  }
  res.json({ base, albums: Array.from(seen.values()) });
});

// Album cover
app.post('/api/album-cover', requirePin, async (req,res)=>{
  const { prefix, coverKey } = req.body||{};
  if(!prefix || !coverKey) return res.status(400).json({ error:'prefix y coverKey requeridos' });
  const key = `${META_PREFIX}${prefix}.mixtli-cover.json`;
  const client=s3();
  await client.send(new PutObjectCommand({ Bucket:R2_BUCKET, Key:key, Body: Buffer.from(JSON.stringify({coverKey},null,2)), ContentType:'application/json' }));
  res.json({ ok:true, key });
});

// New album (placeholder)
app.post('/api/album/new', requirePin, async (req,res)=>{
  const { prefix } = req.body||{};
  if(!prefix || !prefix.endsWith('/')) return res.status(400).json({ error:'prefix con / requerido' });
  const client=s3();
  const keepKey = `${prefix}.keep`;
  await client.send(new PutObjectCommand({ Bucket:R2_BUCKET, Key:keepKey, Body: Buffer.alloc(0), ContentType:'application/octet-stream' }));
  res.json({ ok:true, prefix });
});

// Rename album (move all objects)
app.post('/api/album/rename', requirePin, async (req,res)=>{
  const { fromPrefix, toPrefix } = req.body||{};
  if(!fromPrefix || !toPrefix) return res.status(400).json({ error:'fromPrefix y toPrefix requeridos' });
  const client=s3();
  let token=undefined; const moved=[];
  do{
    const r = await client.send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: fromPrefix, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      const rel = o.Key.substring(fromPrefix.length);
      const toKey = `${toPrefix}${rel}`;
      await client.send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource: `/${R2_BUCKET}/${encodeURIComponent(o.Key)}`, Key: toKey }));
      await client.send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key:o.Key }));
      moved.push({ from:o.Key, to:toKey });
      if(moved.length > 5000) break;
    }
  }while(token);
  res.json({ ok:true, moved:moved.length });
});

// Delete -> trash
app.post('/api/delete', requirePin, async (req,res)=>{
  const { key } = req.body||{};
  if(!key) return res.status(400).json({ error:'key requerido' });
  const base = path.basename(key);
  const trashKey = `${TRASH_PREFIX}${Date.now()}-${base}`;
  const client=s3();
  await client.send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${encodeURIComponent(key)}`, Key: trashKey }));
  await client.send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key:key }));
  res.json({ ok:true, trashKey });
});

// Restore from trash
app.post('/api/restore', requirePin, async (req,res)=>{
  const { trashKey, toKey } = req.body||{};
  if(!trashKey || !toKey) return res.status(400).json({ error:'trashKey y toKey requeridos' });
  const client=s3();
  await client.send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${encodeURIComponent(trashKey)}`, Key: toKey }));
  await client.send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key:trashKey }));
  res.json({ ok:true, key: toKey });
});

// Purge (single or by prefix)
app.post('/api/purge', requirePin, async (req,res)=>{
  const { trashKey, prefix } = req.body||{};
  const client=s3();
  if(trashKey){
    await client.send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key:trashKey }));
    return res.json({ ok:true, deleted:1 });
  }
  if(!prefix) return res.status(400).json({ error:'trashKey o prefix requeridos' });
  let token=undefined; let n=0;
  do{
    const r = await client.send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      await client.send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key:o.Key }));
      n++;
    }
  }while(token);
  res.json({ ok:true, deleted: n });
});

// Rename (single)
app.post('/api/rename', requirePin, async (req,res)=>{
  const { fromKey, toKey } = req.body||{};
  if(!fromKey || !toKey) return res.status(400).json({ error:'fromKey y toKey requeridos' });
  const client=s3();
  await client.send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${encodeURIComponent(fromKey)}`, Key: toKey }));
  await client.send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key:fromKey }));
  res.json({ ok:true, key: toKey });
});

// ZIP endpoint (stream from R2)
app.get('/api/zip', async (req,res)=>{
  const prefix = req.query.prefix;
  if(!prefix) return res.status(400).json({ error:'prefix requerido' });
  const client=s3();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent((prefix.replace(/[\/]+$/,'')||'album').split('/').pop())}.zip"`);
  const archive = Archiver('zip', { zlib:{ level: 9 } });
  archive.on('error', err => res.status(500).end(String(err)));
  archive.pipe(res);
  let token=undefined; let count=0;
  do{
    const r = await client.send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      if(o.Key.endsWith('/')) continue;
      const obj = await client.send(new GetObjectCommand({ Bucket:R2_BUCKET, Key:o.Key }));
      const rel = o.Key.substring(prefix.length);
      archive.append(obj.Body, { name: rel || path.basename(o.Key) });
      count++; if(count>=ZIP_MAX_KEYS) { token=null; break; }
    }
  }while(token);
  archive.finalize();
});

// Meta get/set
app.get('/api/meta/get', async (req,res)=>{
  const key = req.query.key;
  if(!key) return res.status(400).json({ error:'key requerido' });
  const metaKey = `${META_PREFIX}${key}.json`;
  try{
    const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key: metaKey }));
    const buf = await obj.Body.transformToByteArray();
    return res.json(JSON.parse(Buffer.from(buf).toString('utf8')));
  }catch{
    return res.json({ tags:[], caption:'' });
  }
});
app.post('/api/meta/set', requirePin, async (req,res)=>{
  const { key, tags=[], caption='' } = req.body||{};
  if(!key) return res.status(400).json({ error:'key requerido' });
  const metaKey = `${META_PREFIX}${key}.json`;
  await s3().send(new PutObjectCommand({ Bucket:R2_BUCKET, Key: metaKey, Body: Buffer.from(JSON.stringify({ tags, caption }, null, 2)), ContentType:'application/json' }));
  res.json({ ok:true });
});

// Thumbnails
async function generateThumb(key, width=512){
  const client=s3();
  const src = await client.send(new GetObjectCommand({ Bucket:R2_BUCKET, Key:key }));
  const buf = Buffer.from(await src.Body.transformToByteArray());
  const out = await sharp(buf).rotate().resize({ width, withoutEnlargement:true }).jpeg({ quality:78 });
  const tKey = `${THUMBS_PREFIX}${key}.jpg`;
  await client.send(new PutObjectCommand({ Bucket:R2_BUCKET, Key:tKey, Body: await out.toBuffer(), ContentType:'image/jpeg', CacheControl:'public, max-age=2592000' }));
  return tKey;
}
app.post('/api/thumbs/generate', requirePin, async (req,res)=>{
  const { key, width=512 } = req.body||{};
  if(!key) return res.status(400).json({ error:'key requerido' });
  if(!isImageKey(key)) return res.status(400).json({ error:'sólo imágenes' });
  const tKey = await generateThumb(key, width);
  res.json({ ok:true, key: tKey, publicUrl: (key.startsWith(PUBLIC_PREFIX)&&R2_PUBLIC_BASE)? `${R2_PUBLIC_BASE}/${tKey}` : null });
});
app.get('/api/thumbs/sign-get', async (req,res)=>{
  const key = req.query.key;
  if(!key) return res.status(400).json({ error:'key requerido' });
  const tKey = `${THUMBS_PREFIX}${key}.jpg`;
  try{
    await s3().send(new HeadObjectCommand({ Bucket:R2_BUCKET, Key:tKey }));
  }catch{
    // auto-generate if allowed
    if(THUMBS_AUTO && isImageKey(key)){
      try{ await generateThumb(key, 512); }catch{}
    }
  }
  if(key.startsWith(PUBLIC_PREFIX) && R2_PUBLIC_BASE){
    return res.json({ url: `${R2_PUBLIC_BASE}/${tKey}` });
  }
  const url = await getSignedUrl(s3(), new GetObjectCommand({ Bucket:R2_BUCKET, Key:tKey }), { expiresIn: 3600 });
  res.json({ url });
});

// Share: create token, store JSON, serve gallery & zip link
function rand(n=16){ return crypto.randomBytes(n).toString('hex') }
app.post('/api/share/create', requirePin, async (req,res)=>{
  const { prefix, expiresSec=86400 } = req.body||{};
  if(!prefix) return res.status(400).json({ error:'prefix requerido' });
  const token = rand(8);
  const expiresAt = new Date(Date.now() + expiresSec*1000).toISOString();
  const desc = { prefix, expiresAt };
  const jsonKey = `${SHARES_PREFIX}${token}.json`;
  await s3().send(new PutObjectCommand({ Bucket:R2_BUCKET, Key: jsonKey, Body: Buffer.from(JSON.stringify(desc), 'utf8'), ContentType:'application/json' }));
  const galleryUrl = `/share/${token}`;
  const zipUrl = `/api/share/zip?token=${token}`;
  res.json({ ok:true, token, expiresAt, galleryUrl, zipUrl });
});
async function getShare(token){
  const jsonKey = `${SHARES_PREFIX}${token}.json`;
  const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key: jsonKey }));
  const buf = await obj.Body.transformToByteArray();
  const d = JSON.parse(Buffer.from(buf).toString('utf8'));
  if(new Date(d.expiresAt) < new Date()) throw new Error('expired');
  return d;
}
app.get('/api/share/assets', async (req,res)=>{
  const token=req.query.token; if(!token) return res.status(400).json({ error:'token' });
  const d = await getShare(token);
  const client=s3(); const out=[]; let tk=undefined;
  do{
    const r = await client.send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: d.prefix, ContinuationToken: tk, MaxKeys: 1000 }));
    tk = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      if(o.Key.endsWith('/')) continue;
      const isImg=isImageKey(o.Key), isVid=isVideoKey(o.Key), isPdf=isPdfKey(o.Key);
      out.push({ key:o.Key, size:o.Size||0, lastModified:o.LastModified||null, isImg, isVid, isPdf });
    }
  }while(tk);
  res.json({ prefix: d.prefix, items: out });
});
app.get('/api/share/sign-get', async (req,res)=>{
  const token=req.query.token; const key=req.query.key;
  if(!token||!key) return res.status(400).json({ error:'token y key' });
  const d = await getShare(token);
  if(!key.startsWith(d.prefix)) return res.status(403).json({ error:'fuera de alcance' });
  const url = await getSignedUrl(s3(), new GetObjectCommand({ Bucket:R2_BUCKET, Key:key }), { expiresIn: 3600 });
  res.json({ url });
});
app.get('/api/share/zip', async (req,res)=>{
  const token=req.query.token; if(!token) return res.status(400).json({ error:'token' });
  const d = await getShare(token);
  req.query.prefix = d.prefix;
  return app._router.handle(req, res, ()=>{}, 'get', '/api/zip');
});

// Simple gallery page
app.get('/share/:token', async (req,res)=>{
  const token = req.params.token;
  const html = `<!doctype html>
  <meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Mixtli — Álbum compartido</title>
  <style>
    body{background:#0b0b0f;color:#e5e7eb;font-family:ui-sans-serif,system-ui;padding:16px;max-width:1100px;margin:auto}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
    .card{border:1px solid #27272a;background:#0f0f14;border-radius:12px;padding:8px}
    .thumb{aspect-ratio:16/10;background:#0f172a;display:grid;place-items:center;overflow:hidden;border-radius:8px}
    .thumb img{width:100%;height:100%;object-fit:cover}
    a.btn{display:inline-block;padding:8px 12px;border-radius:10px;background:#2563eb;color:white;text-decoration:none;margin:6px 0}
  </style>
  <h1>Mixtli — Álbum compartido</h1>
  <div><a class="btn" id="dl" href="#">Descargar ZIP</a></div>
  <div class="grid" id="g"></div>
  <script>
  const token=${JSON.stringify(token)};
  async function load(){
    const a=await fetch('/api/share/assets?token='+token).then(r=>r.json());
    document.getElementById('dl').href='/api/share/zip?token='+token;
    const g=document.getElementById('g'); g.innerHTML='';
    for(const it of a.items){
      const card=document.createElement('div'); card.className='card';
      const t=document.createElement('div'); t.className='thumb'; card.appendChild(t);
      const img=document.createElement('img'); img.loading='lazy';
      const r=await fetch('/api/share/sign-get?token='+token+'&key='+encodeURIComponent(it.key)).then(r=>r.json());
      img.src=r.url; t.appendChild(img);
      const p=document.createElement('div'); p.style.fontSize='12px'; p.textContent=it.key; card.appendChild(p);
      g.appendChild(card);
    }
  }
  load();
  </script>`;
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(html);
});

// Auto-thumbs on upload completion — placeholder hooks (no-op here, since presign/complete are upstream in user's server)
app.post('/api/complete', requirePin, async (req,res)=>{
  const { key } = req.body||{};
  if(!key) return res.status(400).json({ error:'key requerido' });
  if(THUMBS_AUTO && isImageKey(key)){
    try{ await generateThumb(key, 512) }catch{}
  }
  res.json({ ok:true, key });
});

// Minimal presign endpoints left as stubs (user ya los tiene). Opcionalmente puedes usar estos.
app.post('/api/presign', requirePin, async (req,res)=>{
  const { filename, type='application/octet-stream', prefix='' } = req.body||{};
  const safeName = filename.replace(/[^\w\-.]+/g,'_');
  const key = `${prefix||''}${safeName}`;
  const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket:R2_BUCKET, Key:key, ContentType:type }), { expiresIn: 3600 });
  res.json({ url, key });
});

// Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>{
  console.log('[Mixtli v4] ALLOWED_ORIGINS =', ALLOWED_ORIGINS);
  console.log('Mixtli API on :'+PORT);
});
