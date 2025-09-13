import express from 'express';
import bodyParser from 'body-parser';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command,
  CopyObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT || 10000;
const BUCKET = process.env.R2_BUCKET;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT || (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
const FORCE_PATH_STYLE = process.env.R2_FORCE_PATH_STYLE === 'true' ? true : true;
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE || (ACCOUNT_ID && BUCKET ? `https://${BUCKET}.${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

const PRESIGN_EXPIRES = parseInt(process.env.PRESIGN_EXPIRES || '3600', 10);
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '50', 10);

const PUBLIC_TOGGLE_MODE = (process.env.PUBLIC_TOGGLE_MODE || 'prefix').toLowerCase();
const PUBLIC_PREFIX = process.env.PUBLIC_PREFIX || 'public/';
const PRIVATE_PREFIX = process.env.PRIVATE_PREFIX || '_private/';
const TRASH_PREFIX = process.env.TRASH_PREFIX || '_trash/';
const ZIP_MAX_KEYS = parseInt(process.env.ZIP_MAX_KEYS || '2000', 10);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:8080,http://localhost:8080,http://localhost:5173')
  .split(',').map(s=>s.trim()).filter(Boolean);

console.log('[CORS] ALLOWED_ORIGINS (final) =', ALLOWED_ORIGINS);

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: FORCE_PATH_STYLE,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }
});

const app = express();

// CORS simple
app.use((req,res,next)=>{
  const origin = req.headers.origin || '';
  if(origin && ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
  res.setHeader('Access-Control-Max-Age','86400');
  if(req.method==='OPTIONS') return res.status(204).end();
  next();
});
app.use(bodyParser.json({ limit: '2mb' }));

const norm = p => (!p ? '' : (p.endsWith('/') ? p : p + '/'));
const publicUrlFor = key => PUBLIC_BASE ? `${PUBLIC_BASE}/${key.split('/').map(encodeURIComponent).join('/')}` : null;
const keyFromBody = (filename, prefix) => {
  const clean = String(filename||'file').replace(/[^a-zA-Z0-9._-]/g,'_');
  const pref = norm(prefix);
  return `${pref}${Date.now()}-${randomUUID().slice(0,12)}-${clean}`;
}
const parseIntSafe = (v,d=0)=> { const n=parseInt(v,10); return Number.isFinite(n)?n:d; }

app.get('/api/health', (req,res)=> res.json({ok:true,time:new Date().toISOString()}));
app.get('/api/debug', (req,res)=>{
  const origin = req.headers.origin || null;
  res.json({ origin, allowed:ALLOWED_ORIGINS, match: !!(origin && ALLOWED_ORIGINS.includes(origin)) });
});

// Presign PUT
app.post('/api/presign', async (req,res)=>{
  try{
    const { filename, type, size, prefix } = req.body || {};
    if(!filename) return res.status(400).json({ error:'filename required' });
    if(size && size > MAX_UPLOAD_MB*1024*1024) return res.status(400).json({ error:`Max ${MAX_UPLOAD_MB}MB for single PUT` });
    const Key = keyFromBody(filename, prefix);
    const put = new PutObjectCommand({ Bucket: BUCKET, Key, ContentType: type || 'application/octet-stream' });
    const url = await getSignedUrl(s3, put, { expiresIn: PRESIGN_EXPIRES });
    res.json({ url, key:Key, bucket:BUCKET, publicUrl:publicUrlFor(Key), expiresIn:PRESIGN_EXPIRES });
  }catch(e){ console.error('presign',e); res.status(500).json({error:String(e)}) }
});

app.post('/api/complete', async (req,res)=>{
  try{
    const { key } = req.body || {};
    if(!key) return res.status(400).json({ error:'key required' });
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key:key }), { expiresIn: PRESIGN_EXPIRES });
    res.json({ ok:true, getUrl:url });
  }catch(e){ console.error('complete',e); res.status(500).json({error:String(e)}) }
});

// List
app.get('/api/assets', async (req,res)=>{
  try{
    const prefix = req.query.prefix ? norm(req.query.prefix) : '';
    const token = req.query.token || undefined;
    const limit = Math.min(parseIntSafe(req.query.limit, 200), 1000);
    const out = await s3.send(new ListObjectsV2Command({ Bucket:BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: limit }));
    const items = (out.Contents || []).filter(o=>o.Key && !o.Key.endsWith('/')).map(o=>{
      let publicUrl = publicUrlFor(o.Key);
      if(PUBLIC_TOGGLE_MODE==='prefix'){
        if(!(o.Key.startsWith(PUBLIC_PREFIX))) publicUrl = null;
      }
      return { key: o.Key, size: o.Size, lastModified: o.LastModified, publicUrl };
    });
    res.json({ items, nextToken: out.IsTruncated ? out.NextContinuationToken : null });
  }catch(e){ console.error('assets',e); res.status(500).json({error:String(e)}) }
});

app.post('/api/sign-get', async (req,res)=>{
  try{
    const { key, download } = req.body || {};
    if(!key) return res.status(400).json({ error:'key required' });
    const get = new GetObjectCommand({ Bucket:BUCKET, Key:key, ...(download?{ResponseContentDisposition:`attachment; filename="${encodeURIComponent(key.split('/').pop())}"`}:{}) });
    const url = await getSignedUrl(s3, get, { expiresIn: PRESIGN_EXPIRES });
    res.json({ url, expiresIn:PRESIGN_EXPIRES });
  }catch(e){ console.error('sign-get',e); res.status(500).json({error:String(e)}) }
});

app.post('/api/rename', async (req,res)=>{
  try{
    const { fromKey, toKey } = req.body || {};
    if(!fromKey || !toKey) return res.status(400).json({ error:'fromKey & toKey required' });
    await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: `/${BUCKET}/${encodeURIComponent(fromKey)}`, Key: toKey }));
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fromKey }));
    res.json({ ok:true });
  }catch(e){ console.error('rename',e); res.status(500).json({error:String(e)}) }
});

// Soft delete -> trash
app.post('/api/delete', async (req,res)=>{
  try{
    const { key } = req.body || {};
    if(!key) return res.status(400).json({ error:'key required' });
    const base = key.split('/').pop();
    const dest = `${norm(TRASH_PREFIX)}${Date.now()}-${base}`;
    await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource:`/${BUCKET}/${encodeURIComponent(key)}`, Key: dest }));
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    res.json({ ok:true, trashed: dest });
  }catch(e){ console.error('delete',e); res.status(500).json({error:String(e)}) }
});

app.post('/api/restore', async (req,res)=>{
  try{
    const { trashKey, toKey } = req.body || {};
    if(!trashKey || !toKey) return res.status(400).json({ error:'trashKey & toKey required' });
    await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource:`/${BUCKET}/${encodeURIComponent(trashKey)}`, Key: toKey }));
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: trashKey }));
    res.json({ ok:true });
  }catch(e){ console.error('restore',e); res.status(500).json({error:String(e)}) }
});

// Public toggle por prefijo
app.post('/api/public', async (req,res)=>{
  try{
    const { keys, public:isPublic } = req.body || {};
    const list = Array.isArray(keys)? keys : [];
    if(list.length===0) return res.status(400).json({ error:'keys[] required' });
    for(const fromKey of list){
      let dest;
      if(isPublic){
        const stripped = fromKey.startsWith(PRIVATE_PREFIX) ? fromKey.slice(PRIVATE_PREFIX.length) : fromKey;
        dest = `${norm(PUBLIC_PREFIX)}${stripped.replace(/^public\//,'')}`;
      } else {
        const stripped = fromKey.startsWith(PUBLIC_PREFIX) ? fromKey.slice(PUBLIC_PREFIX.length) : fromKey;
        dest = `${norm(PRIVATE_PREFIX)}${stripped.replace(/^_private\//,'')}`;
      }
      if(dest !== fromKey){
        await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource:`/${BUCKET}/${encodeURIComponent(fromKey)}`, Key: dest }));
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fromKey }));
      }
    }
    res.json({ ok:true, mode:'prefix' });
  }catch(e){ console.error('public',e); res.status(500).json({error:String(e)}) }
});

// ZIP álbum
app.get('/api/zip', async (req,res)=>{
  try{
    const prefix = req.query.prefix ? norm(req.query.prefix) : '';
    let token, keys=[];
    do{
      const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token, MaxKeys: 1000 }));
      (out.Contents||[]).forEach(o=>{ if(o.Key && !o.Key.endsWith('/')) keys.push(o.Key) });
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
      if(keys.length>=ZIP_MAX_KEYS) break;
    } while(token);
    if(keys.length===0) return res.status(404).json({ error:'No files' });
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent((prefix||'album').replace(/\/$/,''))}.zip"`);
    const archive = archiver('zip',{ zlib:{ level:9 }});
    archive.on('error', err=>{ try{ res.status(500).end(String(err)) }catch{} });
    archive.pipe(res);
    for(const key of keys){
      const rel = prefix ? key.slice(prefix.length) : key;
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      archive.append(obj.Body, { name: rel || key });
    }
    await archive.finalize();
  }catch(e){ console.error('zip',e); if(!res.headersSent){ res.status(500).json({error:String(e)}) } else { try{ res.end() }catch{} } }
});

// Multipart
const DEFAULT_PART_SIZE = parseInt(process.env.MULTIPART_PART_SIZE || '10485760', 10);

app.post('/api/multipart/init', async (req,res)=>{
  try{
    const { filename, type, size, prefix } = req.body || {};
    if(!filename) return res.status(400).json({ error:'filename required' });
    const Key = keyFromBody(filename, prefix);
    const out = await s3.send(new CreateMultipartUploadCommand({ Bucket: BUCKET, Key, ContentType: type || 'application/octet-stream' }));
    res.json({ key: out.Key, uploadId: out.UploadId, partSize: DEFAULT_PART_SIZE, bucket: BUCKET });
  }catch(e){ console.error('mpu init',e); res.status(500).json({error:String(e)}) }
});

app.post('/api/multipart/part-url', async (req,res)=>{
  try{
    const { key, uploadId, partNumber } = req.body || {};
    if(!key || !uploadId || !partNumber) return res.status(400).json({ error:'key, uploadId, partNumber required' });
    const cmd = new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: Number(partNumber), Body: undefined });
    const url = await getSignedUrl(s3, cmd, { expiresIn: PRESIGN_EXPIRES });
    res.json({ url });
  }catch(e){ console.error('mpu part-url',e); res.status(500).json({error:String(e)}) }
});

app.post('/api/multipart/complete', async (req,res)=>{
  try{
    const { key, uploadId, parts } = req.body || {};
    if(!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ error:'key, uploadId, parts[] required' });
    const out = await s3.send(new CompleteMultipartUploadCommand({
      Bucket: BUCKET, Key: key, UploadId: uploadId,
      MultipartUpload: { Parts: parts.map(p=>({ ETag: p.ETag, PartNumber: Number(p.PartNumber) })) }
    }));
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: PRESIGN_EXPIRES });
    res.json({ ok:true, key: out.Key, location: out.Location || null, getUrl: url });
  }catch(e){ console.error('mpu complete',e); res.status(500).json({error:String(e)}) }
});

app.post('/api/multipart/abort', async (req,res)=>{
  try{
    const { key, uploadId } = req.body || {};
    if(!key || !uploadId) return res.status(400).json({ error:'key, uploadId required' });
    await s3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));
    res.json({ ok:true });
  }catch(e){ console.error('mpu abort',e); res.status(500).json({error:String(e)}) }
});

app.listen(PORT, ()=> console.log(`Mixtli API on :${PORT}`));
