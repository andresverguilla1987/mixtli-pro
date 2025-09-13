import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import {
  S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand,
  ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();

const normalize = s => (s||'').toLowerCase().replace(/\/$/, '').trim();
const DEFAULT_ORIGINS = ['https://lovely-bienenstitch-6344a1.netlify.app'];
const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
  .split(',').map(normalize).filter(Boolean);
const ALLOWED = Array.from(new Set([...DEFAULT_ORIGINS.map(normalize), ...envOrigins]));
const ALLOWED_SET = new Set(ALLOWED);
console.log('[CORS] ALLOWED_ORIGINS (final) =', ALLOWED);
app.use((req,res,next)=>{res.setHeader('Vary','Origin'); next();});
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const o = normalize(origin);
    if (ALLOWED_SET.has(o)) return cb(null, true);
    return cb(new Error(`CORS not allowed: ${origin}`));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS','HEAD'],
  maxAge: 86400,
}));
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req,res)=>res.json({ok:true,time:new Date().toISOString()}));
app.get('/api/debug', (req,res)=>{
  const origin = req.headers.origin || null;
  const normalized = normalize(origin);
  res.json({ origin, normalized, allowed: ALLOWED, match: origin ? ALLOWED_SET.has(normalized) : true });
});

function makeS3(){
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new Error('Faltan credenciales R2');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}
const s3 = makeS3();

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = (process.env.ALLOWED_MIME_PREFIXES || 'image/,application/pdf').split(',').map(s=>s.trim()).filter(Boolean);
const bucket = process.env.R2_BUCKET;
const publicBase = process.env.R2_PUBLIC_BASE || (bucket && process.env.R2_ACCOUNT_ID ? `https://${bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null);

function extFromName(name=''){ const i = name.lastIndexOf('.'); return i>=0 ? name.slice(i) : ''; }
function safeKey(filename='file.bin'){
  const stamp = Date.now(); const rand = crypto.randomBytes(6).toString('hex'); const ext = extFromName(filename).toLowerCase().slice(0,10);
  return `${stamp}-${rand}${ext}`;
}
function mimeAllowed(type=''){ return !!type && ALLOWED_MIME_PREFIXES.some(p => type===p || type.startsWith(p)); }

app.post('/api/presign', async (req,res)=>{
  try{
    const { filename, type, size } = req.body || {};
    if (!bucket) return res.status(500).json({ error:'Falta R2_BUCKET' });
    if (!(size>0)) return res.status(400).json({ error:'size requerido' });
    if (size > MAX_BYTES) return res.status(413).json({ error:'Archivo excede 50 MB' });
    if (!mimeAllowed(type)) return res.status(415).json({ error:'MIME no permitido', allowed: ALLOWED_MIME_PREFIXES });
    const Key = safeKey(filename);
    const command = new PutObjectCommand({ Bucket: bucket, Key, ContentType: type || 'application/octet-stream' });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = publicBase ? `${publicBase}/${Key}` : null;
    res.json({ url, key: Key, bucket, publicUrl, expiresIn: 3600 });
  }catch(e){ console.error('presign', e); res.status(500).json({ error:'presign failed', detail:String(e?.message||e) }); }
});

app.post('/api/complete', async (req,res)=>{
  try{
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error:'key requerida' });
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const size = head.ContentLength, type = head.ContentType;
    const getUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 900 });
    res.json({ ok:true, key, size, type, getUrl });
  }catch(e){ console.error('complete', e); res.status(500).json({ error:'complete failed', detail:String(e?.message||e) }); }
});

app.get('/api/assets', async (req,res)=>{
  try{
    const { prefix = '', token = null, limit = 20 } = req.query;
    const out = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || undefined,
      ContinuationToken: token || undefined,
      MaxKeys: Math.max(1, Math.min(parseInt(limit || 20, 10), 100)),
    }));
    const items = (out.Contents || []).map(o => ({
      key: o.Key, size: o.Size, lastModified: o.LastModified,
      publicUrl: publicBase ? `${publicBase}/${o.Key}` : null,
    }));
    res.json({ items, isTruncated: !!out.IsTruncated, nextToken: out.NextContinuationToken || null, prefix: prefix || '' });
  }catch(e){ console.error('assets', e); res.status(500).json({ error:'assets failed', detail:String(e?.message||e) }); }
});

app.post('/api/delete', async (req,res)=>{
  try{
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error:'key requerida' });
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    res.json({ ok:true });
  }catch(e){ console.error('delete', e); res.status(500).json({ error:'delete failed', detail:String(e?.message||e) }); }
});

app.post('/api/rename', async (req,res)=>{
  try{
    const { fromKey, toKey } = req.body || {};
    if (!fromKey || !toKey) return res.status(400).json({ error:'fromKey y toKey requeridos' });
    await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `/${bucket}/${encodeURIComponent(fromKey)}`, Key: toKey }));
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: fromKey }));
    res.json({ ok:true, key: toKey });
  }catch(e){ console.error('rename', e); res.status(500).json({ error:'rename failed', detail:String(e?.message||e) }); }
});

app.post('/api/sign-get', async (req,res)=>{
  try{
    const { key, expiresIn = 900 } = req.body || {};
    if (!key) return res.status(400).json({ error:'key requerida' });
    const ttl = Math.min(Math.max(60, Number(expiresIn)), 3600);
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: ttl });
    res.json({ url, expiresIn: ttl });
  }catch(e){ console.error('sign-get', e); res.status(500).json({ error:'sign-get failed', detail:String(e?.message||e) }); }
});

app.use('/', express.static('public', { extensions: ['html'], maxAge: 0 }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`Mixtli API on :${PORT}`));
