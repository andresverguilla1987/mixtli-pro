import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'node:path';
import Archiver from 'archiver';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

function parseOrigins(str) { return (str||'').split(',').map(s=>s.trim()).filter(Boolean); }
const ALLOWED_ORIGINS = parseOrigins(process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN);
const ADMIN_PIN = process.env.ADMIN_PIN || '';
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

function s3(){
  return new S3Client({ region:'auto', endpoint:R2_ENDPOINT, credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY } });
}
const isImg = k => ['jpg','jpeg','png','webp','gif','avif','bmp'].includes((k.split('.').pop()||'').toLowerCase());
const isVid = k => ['mp4','mov','webm','mkv','avi'].includes((k.split('.').pop()||'').toLowerCase());
const isPdf = k => (k.split('.').pop()||'').toLowerCase()==='pdf';

app.use(cors({
  origin: (origin, cb)=>{
    if(!origin) return cb(null,true);
    const ok = ALLOWED_ORIGINS.includes(origin);
    if(!ok) return cb(new Error('CORS not allowed: '+origin));
    cb(null,true);
  },
  credentials:true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','x-mixtli-pin']
}));

function requirePin(req,res,next){
  if(!ADMIN_PIN) return next();
  const pin = req.header('x-mixtli-pin') || req.query.pin;
  if(pin === ADMIN_PIN) return next();
  res.status(401).json({ error: 'PIN requerido' });
}

app.get('/api/health', (req,res)=> res.json({ ok:true, time:new Date().toISOString() }));
app.get('/api/debug', (req,res)=>{
  const origin = req.headers.origin || null;
  res.json({ origin, allowed: ALLOWED_ORIGINS, match: origin? ALLOWED_ORIGINS.includes(origin):true });
});
app.get('/api/config', (req,res)=>{
  res.json({
    zipMaxKeys: ZIP_MAX_KEYS,
    publicPrefix: PUBLIC_PREFIX, privatePrefix: PRIVATE_PREFIX, trashPrefix: TRASH_PREFIX,
    thumbsPrefix: THUMBS_PREFIX, sharesPrefix: SHARES_PREFIX, metaPrefix: META_PREFIX,
    thumbsAuto: THUMBS_AUTO, publicBase: R2_PUBLIC_BASE ? true : false
  });
});

// Simple sign GET
app.post('/api/sign-get', async (req,res)=>{
  const { key, expiresIn=3600 } = req.body||{};
  if(!key) return res.status(400).json({ error:'key requerido' });
  const url = await getSignedUrl(s3(), new GetObjectCommand({ Bucket:R2_BUCKET, Key:key }), { expiresIn });
  res.json({ url });
});

// List assets
app.get('/api/assets', async (req,res)=>{
  const prefix = req.query.prefix || '';
  const token = req.query.token || undefined;
  const r = await s3().send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
  const items = [];
  for(const o of (r.Contents||[])){
    if(o.Key.endsWith('/')) continue;
    let publicUrl = null, thumbPublicUrl = null;
    if(o.Key.startsWith(PUBLIC_PREFIX) && R2_PUBLIC_BASE){ publicUrl = `${R2_PUBLIC_BASE}/${o.Key}`; }
    const tKey = `${THUMBS_PREFIX}${o.Key}.jpg`;
    try{ await s3().send(new HeadObjectCommand({ Bucket:R2_BUCKET, Key: tKey })); if(o.Key.startsWith(PUBLIC_PREFIX) && R2_PUBLIC_BASE){ thumbPublicUrl = `${R2_PUBLIC_BASE}/${tKey}` } }catch{}
    items.push({ key:o.Key, size:o.Size||0, lastModified:o.LastModified||null, publicUrl, thumbPublicUrl });
  }
  res.json({ items, nextToken: r.IsTruncated ? r.NextContinuationToken : null });
});

// Albums + cover
app.get('/api/albums', async (req,res)=>{
  const base = req.query.base || PUBLIC_PREFIX;
  const seen = new Map();
  let token=undefined;
  do{
    const r = await s3().send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: base, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      const rest = o.Key.substring(base.length);
      const top = rest.split('/')[0];
      if(!top) continue;
      const prefix = `${base}${top}/`;
      if(!seen.has(prefix)) seen.set(prefix, { prefix, name: top, count:0, totalSize:0, coverKey:null, coverPublicUrl:null });
      const it = seen.get(prefix);
      if(!o.Key.endsWith('/')){ it.count++; it.totalSize+=(o.Size||0); }
    }
  }while(token);
  for(const [prefix, it] of seen){
    try{
      const metaKey = `${META_PREFIX}${prefix}.mixtli-cover.json`;
      const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key: metaKey }));
      const buf = Buffer.from(await obj.Body.transformToByteArray()).toString('utf8');
      const j = JSON.parse(buf);
      it.coverKey = j.coverKey || null;
      if(it.coverKey && it.coverKey.startsWith(PUBLIC_PREFIX) && R2_PUBLIC_BASE){ it.coverPublicUrl = `${R2_PUBLIC_BASE}/${it.coverKey}`; }
    }catch{}
  }
  res.json({ base, albums: Array.from(seen.values()) });
});
app.post('/api/album/new', requirePin, async (req,res)=>{
  const { prefix } = req.body||{};
  if(!prefix || !prefix.endsWith('/')) return res.status(400).json({ error:'prefix con / requerido' });
  await s3().send(new PutObjectCommand({ Bucket:R2_BUCKET, Key: `${prefix}.keep`, Body: Buffer.alloc(0) }));
  res.json({ ok:true, prefix });
});
app.post('/api/album/rename', requirePin, async (req,res)=>{
  const { fromPrefix, toPrefix } = req.body||{};
  if(!fromPrefix || !toPrefix) return res.status(400).json({ error:'fromPrefix y toPrefix requeridos' });
  let token=undefined, moved=0;
  do{
    const r = await s3().send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: fromPrefix, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      const rel = o.Key.substring(fromPrefix.length);
      const toKey = `${toPrefix}${rel}`;
      await s3().send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${encodeURIComponent(o.Key)}`, Key: toKey }));
      await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: o.Key }));
      moved++;
    }
  }while(token);
  res.json({ ok:true, moved });
});
app.post('/api/album-cover', requirePin, async (req,res)=>{
  const { prefix, coverKey } = req.body||{};
  if(!prefix || !coverKey) return res.status(400).json({ error:'prefix y coverKey' });
  const key = `${META_PREFIX}${prefix}.mixtli-cover.json`;
  await s3().send(new PutObjectCommand({ Bucket:R2_BUCKET, Key: key, Body: Buffer.from(JSON.stringify({ coverKey }, null, 2)), ContentType:'application/json' }));
  res.json({ ok:true, key });
});

// Delete/restore/purge/rename
app.post('/api/delete', requirePin, async (req,res)=>{
  const { key } = req.body||{}; if(!key) return res.status(400).json({ error:'key' });
  const base = key.split('/').pop();
  const trashKey = `${TRASH_PREFIX}${Date.now()}-${base}`;
  await s3().send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${encodeURIComponent(key)}`, Key: trashKey }));
  await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: key }));
  res.json({ ok:true, trashKey });
});
app.post('/api/restore', requirePin, async (req,res)=>{
  const { trashKey, toKey } = req.body||{};
  if(!trashKey || !toKey) return res.status(400).json({ error:'trashKey y toKey' });
  await s3().send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${encodeURIComponent(trashKey)}`, Key: toKey }));
  await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: trashKey }));
  res.json({ ok:true, key: toKey });
});
app.post('/api/purge', requirePin, async (req,res)=>{
  const { trashKey, prefix } = req.body||{};
  if(trashKey){
    await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: trashKey }));
    return res.json({ ok:true, deleted:1 });
  }
  if(!prefix) return res.status(400).json({ error:'trashKey o prefix' });
  let token=undefined, n=0;
  do{
    const r = await s3().send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key:o.Key })); n++;
    }
  }while(token);
  res.json({ ok:true, deleted:n });
});
app.post('/api/rename', requirePin, async (req,res)=>{
  const { fromKey, toKey } = req.body||{};
  if(!fromKey || !toKey) return res.status(400).json({ error:'fromKey y toKey' });
  await s3().send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${encodeURIComponent(fromKey)}`, Key: toKey }));
  await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: fromKey }));
  res.json({ ok:true, key: toKey });
});

// ZIP with ?limit= (capped by ZIP_MAX_KEYS)
app.get('/api/zip', async (req,res)=>{
  const prefix = req.query.prefix; if(!prefix) return res.status(400).json({ error:'prefix' });
  const reqLimit = Math.max(1, Math.min(parseInt(req.query.limit||`${ZIP_MAX_KEYS}`,10)||ZIP_MAX_KEYS, ZIP_MAX_KEYS));
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent((prefix.replace(/[\/]+$/,'')||'album').split('/').pop())}.zip"`);
  const archive = Archiver('zip', { zlib:{ level:9 } });
  archive.on('error', err => res.status(500).end(String(err)));
  archive.pipe(res);
  let token=undefined, count=0;
  do{
    const r = await s3().send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      if(o.Key.endsWith('/')) continue;
      const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key:o.Key }));
      const rel = o.Key.substring(prefix.length) || path.basename(o.Key);
      archive.append(obj.Body, { name: rel });
      count++; if(count>=reqLimit){ token=null; break; }
    }
  }while(token);
  archive.finalize();
});

// Meta get/set + search
app.get('/api/meta/get', async (req,res)=>{
  const key = req.query.key; if(!key) return res.status(400).json({ error:'key' });
  const mKey = `${META_PREFIX}${key}.json`;
  try{ const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key:mKey })); const buf = Buffer.from(await obj.Body.transformToByteArray()).toString('utf8'); return res.json(JSON.parse(buf)); }catch{ return res.json({ tags:[], caption:'' }) }
});
app.post('/api/meta/set', requirePin, async (req,res)=>{
  const { key, tags=[], caption='' } = req.body||{};
  if(!key) return res.status(400).json({ error:'key' });
  const mKey = `${META_PREFIX}${key}.json`;
  await s3().send(new PutObjectCommand({ Bucket:R2_BUCKET, Key:mKey, Body: Buffer.from(JSON.stringify({ tags, caption }, null, 2)), ContentType:'application/json' }));
  res.json({ ok:true });
});
app.get('/api/search-meta', async (req,res)=>{
  const q=(req.query.query||'').toLowerCase(); if(!q) return res.json({ keys:[] });
  let token=undefined; const keys=[]; let scanned=0;
  do{
    const r = await s3().send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: META_PREFIX, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      if(!o.Key.endsWith('.json')) continue;
      try{
        const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key:o.Key }));
        const buf = Buffer.from(await obj.Body.transformToByteArray()).toString('utf8');
        const m = JSON.parse(buf);
        const hay = (m.caption||'').toLowerCase().includes(q) || (m.tags||[]).some(t=> (t||'').toLowerCase().includes(q));
        if(hay){
          const orig = o.Key.substring(META_PREFIX.length).replace(/\.json$/,'');
          keys.push(orig);
        }
      }catch{}
      scanned++; if(scanned>5000) { token=null; break; }
    }
  }while(token);
  res.json({ keys, scanned });
});

// Thumbs
async function generateThumb(key, width=512){
  const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key:key }));
  const buf = Buffer.from(await obj.Body.transformToByteArray());
  const out = await sharp(buf).rotate().resize({ width, withoutEnlargement:true }).jpeg({ quality:78 });
  const tKey = `${THUMBS_PREFIX}${key}.jpg`;
  await s3().send(new PutObjectCommand({ Bucket:R2_BUCKET, Key:tKey, Body: await out.toBuffer(), ContentType:'image/jpeg', CacheControl:'public, max-age=2592000' }));
  return tKey;
}
app.post('/api/thumbs/generate', requirePin, async (req,res)=>{
  const { key, width=512 } = req.body||{}; if(!key) return res.status(400).json({ error:'key' });
  if(!isImg(key)) return res.status(400).json({ error:'sólo imágenes' });
  const tKey = await generateThumb(key, width);
  res.json({ ok:true, key:tKey, publicUrl: (key.startsWith(PUBLIC_PREFIX)&&R2_PUBLIC_BASE)? `${R2_PUBLIC_BASE}/${tKey}` : null });
});
app.post('/api/thumbs/generate-prefix', requirePin, async (req,res)=>{
  const { prefix, width=512 } = req.body||{}; if(!prefix) return res.status(400).json({ error:'prefix' });
  let token=undefined, n=0;
  do{
    const r = await s3().send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
    token = r.IsTruncated ? r.NextContinuationToken : null;
    for(const o of (r.Contents||[])){
      if(o.Key.endsWith('/')) continue;
      if(isImg(o.Key)){
        try{ await generateThumb(o.Key, width); n++; }catch{}
      }
    }
  }while(token);
  res.json({ ok:true, generated:n });
});

// Upload presign + complete
app.post('/api/presign', requirePin, async (req,res)=>{
  const { filename, type='application/octet-stream', prefix='' } = req.body||{};
  const safe = (filename||'file').replace(/[^\w\-\.]+/g,'_');
  const key = `${prefix||''}${safe}`;
  const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket:R2_BUCKET, Key:key, ContentType: type }), { expiresIn:3600 });
  res.json({ url, key });
});
app.post('/api/complete', requirePin, async (req,res)=>{
  const { key } = req.body||{}; if(!key) return res.status(400).json({ error:'key' });
  if(THUMBS_AUTO && isImg(key)){ try{ await generateThumb(key, 512) }catch{} }
  res.json({ ok:true, key });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>{
  console.log('[Mixtli v5] ALLOWED_ORIGINS =', ALLOWED_ORIGINS);
  console.log('[Mixtli v5] ZIP_MAX_KEYS =', ZIP_MAX_KEYS);
  console.log('Mixtli API on :'+PORT);
});
