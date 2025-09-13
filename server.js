import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import crypto from 'node:crypto';
import Archiver from 'archiver';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
  CopyObjectCommand, ListObjectsV2Command, CreateMultipartUploadCommand,
  UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
app.use((req,res,next)=>{ console.log(`[Mixtli ${process.env.npm_package_version}] ${req.method} ${req.url}`); next(); });
app.use(bodyParser.json({ limit: '100mb' }));

// ------- ENV & CONFIG -------
const parseCSV = s => (s||'').split(',').map(x=>x.trim()).filter(Boolean);
const ALLOWED_ORIGINS = parseCSV(process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN);
const ADMIN_PIN = process.env.ADMIN_PIN || '';
const R2_BUCKET   = process.env.R2_BUCKET;
const ACCOUNT_ID  = process.env.R2_ACCOUNT_ID;
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE || (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : '');

const PUBLIC_PREFIX  = process.env.PUBLIC_PREFIX  || 'public/';
const PRIVATE_PREFIX = process.env.PRIVATE_PREFIX || '_private/';
const TRASH_PREFIX   = process.env.TRASH_PREFIX   || '_trash/';
const SHARES_PREFIX  = process.env.SHARES_PREFIX  || '__shares__/';
const ZIP_MAX_KEYS   = parseInt(process.env.ZIP_MAX_KEYS || '2000', 10);

const s3 = () => new S3Client({ region:'auto', endpoint: R2_ENDPOINT, credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY } });

const isImage = k => /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(k);
const isVideo = k => /\.(mp4|mov|webm|mkv|avi)$/i.test(k);
const isAudio = k => /\.(mp3|wav|ogg|m4a|flac)$/i.test(k);
const isDoc   = k => /\.(pdf|txt|md|docx?|xlsx?|pptx?)$/i.test(k);

app.use(cors({
  origin: (origin, cb)=>{
    if(!origin) return cb(null,true);
    const ok = ALLOWED_ORIGINS.includes(origin);
    if(!ok){ console.log('[CORS] blocked', origin, 'allowed=', ALLOWED_ORIGINS); return cb(new Error('CORS not allowed: '+origin)); }
    cb(null,true);
  },
  credentials:true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','x-mixtli-pin','x-requested-with','accept','authorization','x-amz-*']
}));
app.options('*', cors(), (req,res)=>res.status(204).end());

const mem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50*1024*1024 } });

function requirePin(req,res,next){
  if(!ADMIN_PIN) return next();
  const pin = req.header('x-mixtli-pin') || req.query.pin;
  if(pin === ADMIN_PIN) return next();
  return res.status(401).json({ error: 'PIN requerido' });
}

// ------- UTIL -------
function normalizeKey(k=''){
  k = k.replace(/^\/+/, '');
  return k;
}
function itemType(key){
  if(isImage(key)) return 'image';
  if(isVideo(key)) return 'video';
  if(isAudio(key)) return 'audio';
  if(isDoc(key))   return 'doc';
  return 'other';
}

// ------- BASIC -------
app.get('/api/health', (req,res)=> res.json({ ok:true, time: new Date().toISOString() }));
app.all('/api/diag', (req,res)=>{
  const headers={};
  for(const [k,v] of Object.entries(req.headers)) headers[k]=v;
  res.json({ method:req.method, url:req.url, headers, allowed:ALLOWED_ORIGINS });
});
app.get('/api/config', (req,res)=> res.json({
  publicPrefix: PUBLIC_PREFIX, privatePrefix: PRIVATE_PREFIX, trashPrefix: TRASH_PREFIX,
  sharesPrefix: SHARES_PREFIX, zipMaxKeys: ZIP_MAX_KEYS, r2PublicBase: R2_PUBLIC_BASE
}));

// ------- LIST -------
app.get('/api/list', async (req,res)=>{
  const prefix = normalizeKey(req.query.prefix || PUBLIC_PREFIX);
  const token = req.query.continuationToken || undefined;
  const maxKeys = Math.min(parseInt(req.query.maxKeys || '100', 10), 1000);
  const q = (req.query.q || '').toLowerCase();
  const type = (req.query.type || '').toLowerCase();

  const out = [];
  let NextContinuationToken = token;
  try{
    const resp = await s3().send(new ListObjectsV2Command({ Bucket:R2_BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: maxKeys }));
    NextContinuationToken = resp.NextContinuationToken || null;
    (resp.Contents||[]).forEach(obj=>{
      if(!obj.Key || obj.Key.endsWith('/')) return;
      const key=obj.Key;
      const name= key.split('/').pop();
      if(q && !name.toLowerCase().includes(q)) return;
      const t = itemType(key);
      if(type && t!==type) return;
      out.push({ key, size: obj.Size||0, lastModified: obj.LastModified||null, type: t, url: R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE}/${key}` : null });
    });
    res.json({ ok:true, items: out, continuationToken: NextContinuationToken });
  }catch(e){
    console.error('[list] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

// ------- PRESIGN (single-part) -------
app.post('/api/presign', requirePin, async (req,res)=>{
  try{
    const { key, contentType='application/octet-stream', expiresIn=3600 } = req.body||{};
    const put = new PutObjectCommand({ Bucket:R2_BUCKET, Key: normalizeKey(key), ContentType: contentType });
    const url = await getSignedUrl(s3(), put, { expiresIn });
    res.json({ ok:true, url });
  }catch(e){
    console.error('[presign] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

// ------- MULTIPART -------
app.post('/api/multipart/create', requirePin, async (req,res)=>{
  try{
    const { key, contentType='application/octet-stream', parts=1, expiresIn=3600 } = req.body||{};
    const k = normalizeKey(key);
    const create = await s3().send(new CreateMultipartUploadCommand({ Bucket:R2_BUCKET, Key:k, ContentType: contentType }));
    const uploadId = create.UploadId;
    const urls=[];
    for(let partNumber=1; partNumber<=parts; partNumber++){
      const cmd = new UploadPartCommand({ Bucket:R2_BUCKET, Key:k, UploadId: uploadId, PartNumber: partNumber });
      const url = await getSignedUrl(s3(), cmd, { expiresIn });
      urls.push({ partNumber, url });
    }
    res.json({ ok:true, key: k, uploadId, urls });
  }catch(e){
    console.error('[multipart/create] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

app.post('/api/multipart/complete', requirePin, async (req,res)=>{
  try{
    const { key, uploadId, parts } = req.body||{}; // parts: [{ETag, PartNumber}]
    const k = normalizeKey(key);
    const out = await s3().send(new CompleteMultipartUploadCommand({
      Bucket:R2_BUCKET, Key:k, UploadId: uploadId, MultipartUpload: { Parts: parts }
    }));
    res.json({ ok:true, location: out.Location||null, etag: out.ETag||null, key:k });
  }catch(e){
    console.error('[multipart/complete] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

app.post('/api/multipart/abort', requirePin, async (req,res)=>{
  try{
    const { key, uploadId } = req.body||{};
    const k = normalizeKey(key);
    await s3().send(new AbortMultipartUploadCommand({ Bucket:R2_BUCKET, Key:k, UploadId: uploadId }));
    res.json({ ok:true });
  }catch(e){
    console.error('[multipart/abort] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

// ------- DIRECT UPLOAD (fallback) -------
app.post('/api/upload-direct', requirePin, mem.single('file'), async (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({ error:'file missing' });
    const prefix = (req.body?.prefix || req.query.prefix || PUBLIC_PREFIX).toString();
    const clean = (req.file.originalname||'file').replace(/[^\w\-.]+/g,'_');
    const key = normalizeKey(`${prefix}${clean}`);
    await s3().send(new PutObjectCommand({ Bucket:R2_BUCKET, Key:key, Body:req.file.buffer, ContentType:req.file.mimetype||'application/octet-stream' }));
    res.json({ ok:true, key });
  }catch(e){
    console.error('[upload-direct] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

// ------- MOVE / DELETE / TRASH / RESTORE -------
app.post('/api/move', requirePin, async (req,res)=>{
  try{
    const { keys=[], toPrefix } = req.body||{};
    if(!Array.isArray(keys) || !toPrefix) return res.status(400).json({ error:'keys[] and toPrefix required' });
    const results=[];
    for(const key of keys){
      const dest = normalizeKey(`${toPrefix}${key.split('/').pop()}`);
      await s3().send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource: `/${R2_BUCKET}/${normalizeKey(key)}`, Key: dest }));
      await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: normalizeKey(key) }));
      results.push({ from:key, to:dest });
    }
    res.json({ ok:true, results });
  }catch(e){
    console.error('[move] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

app.post('/api/trash', requirePin, async (req,res)=>{
  try{
    const { keys=[] } = req.body||{};
    const results=[];
    for(const key of keys){
      const dest = normalizeKey(`${TRASH_PREFIX}${key.split('/').pop()}`);
      await s3().send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${normalizeKey(key)}`, Key:dest }));
      await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: normalizeKey(key) }));
      results.push({ from:key, to:dest });
    }
    res.json({ ok:true, results });
  }catch(e){
    console.error('[trash] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

app.post('/api/trash/restore', requirePin, async (req,res)=>{
  try{
    const { keys=[] } = req.body||{};
    const results=[];
    for(const key of keys){
      const dest = normalizeKey(`${PUBLIC_PREFIX}${key.split('/').pop()}`);
      await s3().send(new CopyObjectCommand({ Bucket:R2_BUCKET, CopySource:`/${R2_BUCKET}/${normalizeKey(key)}`, Key:dest }));
      await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: normalizeKey(key) }));
      results.push({ from:key, to:dest });
    }
    res.json({ ok:true, results });
  }catch(e){
    console.error('[restore] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

app.post('/api/delete', requirePin, async (req,res)=>{
  try{
    const { keys=[] } = req.body||{};
    for(const key of keys){
      await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key: normalizeKey(key) }));
    }
    res.json({ ok:true, deleted: keys.length });
  }catch(e){
    console.error('[delete] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

// ------- ZIP DOWNLOAD -------
app.post('/api/zip', requirePin, async (req,res)=>{
  try{
    const { keys=[], name='mixtli.zip' } = req.body||{};
    if(!Array.isArray(keys) || keys.length===0) return res.status(400).json({ error:'keys[] required' });
    if(keys.length > ZIP_MAX_KEYS) return res.status(400).json({ error:`Too many keys. Max ${ZIP_MAX_KEYS}` });
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/[^\w\-.]+/g,'_')}"`);
    const arch = Archiver('zip', { zlib: { level: 9 } });
    arch.on('error', err=>{ console.error('[zip] archiver error', err); res.status(500).end(); });
    arch.pipe(res);
    const client = s3();
    for(const key of keys){
      const obj = await client.send(new GetObjectCommand({ Bucket:R2_BUCKET, Key: normalizeKey(key) }));
      arch.append(obj.Body, { name: key.split('/').pop() });
    }
    await arch.finalize();
  }catch(e){
    console.error('[zip] error', e?.message);
    if(!res.headersSent) res.status(500).json({ error: String(e?.message||e) });
  }
});

// ------- SHARES -------
function newId(){ return crypto.randomBytes(8).toString('hex'); }
app.post('/api/share/create', requirePin, async (req,res)=>{
  try{
    const { prefix=PUBLIC_PREFIX, expiresDays=0 } = req.body||{};
    const id = newId();
    const data = { id, prefix: normalizeKey(prefix), createdAt: new Date().toISOString(), expiresDays };
    const key = `${SHARES_PREFIX}${id}.json`;
    await s3().send(new PutObjectCommand({ Bucket:R2_BUCKET, Key:key, Body: Buffer.from(JSON.stringify(data)), ContentType:'application/json' }));
    const publicUrl = R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE}/${key}` : null;
    res.json({ ok:true, id, apiUrl: `/api/share/${id}`, publicUrl });
  }catch(e){
    console.error('[share/create] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

app.post('/api/share/revoke', requirePin, async (req,res)=>{
  try{
    const { id } = req.body||{};
    if(!id) return res.status(400).json({ error:'id required' });
    const key = `${SHARES_PREFIX}${id}.json`;
    await s3().send(new DeleteObjectCommand({ Bucket:R2_BUCKET, Key:key }));
    res.json({ ok:true });
  }catch(e){
    console.error('[share/revoke] error', e?.message);
    res.status(500).json({ error: String(e?.message||e) });
  }
});

app.get('/api/share/:id', async (req,res)=>{
  try{
    const id = req.params.id;
    const key = `${SHARES_PREFIX}${id}.json`;
    const obj = await s3().send(new GetObjectCommand({ Bucket:R2_BUCKET, Key:key }));
    const text = await obj.Body.transformToString();
    res.setHeader('Content-Type','application/json');
    res.send(text);
  }catch(e){
    res.status(404).json({ error:'share not found' });
  }
});

// ------- 404 fallback -------
app.use((req,res)=> res.status(404).json({ error:'Not found' }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>{
  console.log('[Mixtli] Ready on', PORT);
  console.log('[Mixtli] ALLOWED_ORIGINS =', ALLOWED_ORIGINS);
  console.log('[Mixtli] ZIP_MAX_KEYS =', ZIP_MAX_KEYS);
});
