// server.js — Mixtli API (server-upload) + /api/whoami
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();

// CORS
const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (!allowed.length || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  methods: ['GET','POST'],
  allowedHeaders: ['Content-Type','Authorization','x-mixtli-token']
}));

// Config
const MAX_BYTES = process.env.MAX_BYTES || '200mb';
const PREFIX = (process.env.KEY_PREFIX || 'uploads').replace(/\/+$/,'');
const TOKEN = process.env.API_TOKEN || '';
const ALLOWED_MIME = (process.env.ALLOWED_MIME || 'image/jpeg,image/png,image/webp,image/gif').split(',').map(s=>s.trim()).filter(Boolean);

// Parsers
app.use('/api/upload', express.raw({ type: '*/*', limit: MAX_BYTES }));
app.use(express.json({ limit: '5mb' }));

// S3 (R2)
const s3 = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});

app.get('/api/health', (_req,res)=> res.json({ ok:true, mode:'server-upload', time:new Date().toISOString() }));

// whoami: confirma si el token enviado es válido
app.get('/api/whoami', (req,res) => {
  if (!TOKEN) return res.json({ ok:true, auth:false, note:'API_TOKEN not set' });
  const hdr = req.get('x-mixtli-token') || '';
  if (hdr !== TOKEN) return res.status(401).json({ ok:false, auth:false });
  res.json({ ok:true, auth:true });
});

function sanitizeFilename(name){
  const base = path.basename(name).replace(/\s+/g,'-').replace(/[^A-Za-z0-9._-]/g,'');
  return base.length ? base.slice(-200) : 'file.bin';
}

app.post(['/api/upload','/upload'], async (req, res) => {
  try{
    if (TOKEN) {
      const hdr = req.get('x-mixtli-token') || '';
      if (hdr !== TOKEN) return res.status(401).json({ error:'unauthorized' });
    }
    const rawName = (req.query.filename || 'archivo.bin').toString();
    const contentType = (req.query.contentType || 'application/octet-stream').toString();
    if (!ALLOWED_MIME.includes(contentType)) return res.status(415).json({ error:'unsupported_type', allowed: ALLOWED_MIME });

    const filename = sanitizeFilename(rawName);
    const key = `${PREFIX}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename}`;

    const cacheControl = ALLOWED_MIME.includes(contentType) ? 'public, max-age=31536000, immutable' : 'no-cache';

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: req.body,
      ContentType: contentType,
      CacheControl: cacheControl
    }));

    const downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }), { expiresIn: 600 });
    const pubBase = process.env.PUBLIC_BASE_URL || null;
    const publicUrl = pubBase ? `${pubBase.replace(/\/$/,'')}/${encodeURIComponent(key)}` : null;

    res.json({ status:'ok', key, downloadUrl, publicUrl });
  }catch(e){
    console.error(e);
    res.status(500).json({ error:'upload_failed', message:String(e) });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, ()=>console.log('Mixtli server-upload on :' + port));
