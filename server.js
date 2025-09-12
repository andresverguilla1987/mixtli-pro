// server.js — Mixtli API (server-upload) HARDENED
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();

// --- CORS allowlist (Netlify domains) ---
const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/Postman
    if (!allowed.length || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  methods: ['GET','POST'],
  allowedHeaders: ['Content-Type','Authorization','x-mixtli-token']
}));

// --- Config endurecida ---
const MAX_BYTES = process.env.MAX_BYTES || '200mb';
const PREFIX = (process.env.KEY_PREFIX || 'uploads').replace(/\/+$/,''); // sin slash final
const TOKEN = process.env.API_TOKEN || ''; // si está, exige header x-mixtli-token
const ALLOWED_MIME = (process.env.ALLOWED_MIME || 'image/jpeg,image/png,image/webp,image/gif').split(',').map(s=>s.trim()).filter(Boolean);

// --- Body parsers ---
app.use('/api/upload', express.raw({ type: '*/*', limit: MAX_BYTES }));
app.use(express.json({ limit: '5mb' }));

// --- Auth middleware simple ---
function needAuth(req){
  const p = req.path;
  return (req.method === 'POST' && (p === '/api/upload' || p === '/upload')) ||
         (req.method === 'GET' && p === '/api/signget');
}
app.use((req,res,next)=>{
  if (TOKEN && needAuth(req)) {
    const t = req.get('x-mixtli-token');
    if (t !== TOKEN) return res.status(401).json({ error:'unauthorized' });
  }
  next();
});

// --- S3 (Cloudflare R2) ---
const s3 = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});

app.get('/api/health', (_req, res) => res.json({ ok:true, mode:'server-upload', time:new Date().toISOString() }));

function sanitizeFilename(name){
  const base = path.basename(name).replace(/\s+/g,'-').replace(/[^A-Za-z0-9._-]/g,'');
  return base.length ? base.slice(-200) : 'file.bin';
}

app.post(['/api/upload','/upload'], async (req, res) => {
  try{
    const rawName = (req.query.filename || 'archivo.bin').toString();
    const contentType = (req.query.contentType || 'application/octet-stream').toString();
    if (!ALLOWED_MIME.includes(contentType)) return res.status(415).json({ error:'unsupported_type', allowed: ALLOWED_MIME });
    const filename = sanitizeFilename(rawName);
    const key = `${PREFIX}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename}`;

    await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, Body: req.body, ContentType: contentType }));
    const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }), { expiresIn: 600 });
    const pubBase = process.env.PUBLIC_BASE_URL || null;
    const publicUrl = pubBase ? `${pubBase.replace(/\/$/,'')}/${encodeURIComponent(key)}` : null;
    res.json({ status:'ok', key, downloadUrl, publicUrl });
  }catch(e){
    console.error(e);
    res.status(500).json({ error:'upload_failed', message:String(e) });
  }
});

app.get('/api/signget', async (req, res) => {
  try{
    const key = (req.query.key || '').toString();
    const expires = Number(req.query.expires || 600);
    if (!key) return res.status(400).json({ error:'key requerido' });
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }), { expiresIn: expires });
    res.json({ url, expiresIn: expires });
  }catch(e){
    console.error(e);
    res.status(500).json({ error:'sign_failed', message:String(e) });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, ()=>console.log('Mixtli server-upload on :' + port));
