import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ==== ENV ====
const PORT = process.env.PORT || 10000;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;           // ej. df0f5c959b1ae7e62951010bcf85e79a
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE;         // ej. https://pub-xxxxxx.r2.dev
const R2_EXPIRES = Number(process.env.R2_EXPIRES || 3600); // segundos
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

// ==== S3 Client apuntando a R2 ====
const s3 = new S3Client({
  region: 'auto', // R2 usa 'auto'
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

const app = express();
app.use(express.json({ limit: '2mb' }));

// ==== CORS ====
// Si quieres abrir todo (demo), usa origin: "*" sin credentials.
// Si necesitas cookies/credenciales, usa la lista ALLOWED_ORIGINS y credentials: true.
const corsMiddleware = cors({
  origin: function(origin, cb) {
    // Permitir tools sin Origin (curl, apps) y orígenes listados
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS bloqueado para ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
app.use(corsMiddleware);
app.options('*', corsMiddleware); // preflight

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', driver: 'R2', time: new Date().toISOString() });
});

// Util: genera key segura y ordenada por tiempo
function makeKey(filename='file.bin') {
  const ts = Date.now();
  const rand = crypto.randomBytes(3).toString('hex');
  // sanitizar nombre básico
  const clean = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${ts}-${rand}-${clean}`;
}

// Presign endpoint
app.get('/api/presign', async (req, res) => {
  try {
    const filename = req.query.filename || 'file.bin';
    const contentType = req.query.contentType || 'application/octet-stream';
    const key = makeKey(filename);

    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3, putCmd, { expiresIn: R2_EXPIRES });

    // Cloudflare R2 endpoint público (r2.dev)
    const publicUrl = R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}` : null;

    res.json({
      key,
      url,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      publicUrl,
      expiresIn: R2_EXPIRES
    });
  } catch (err) {
    console.error('presign error', err);
    res.status(500).json({ error: 'presign_failed', message: String(err) });
  }
});

app.post('/api/presign', async (req, res) => {
  try {
    const { filename = 'file.bin', contentType = 'application/octet-stream' } = req.body || {};
    const key = makeKey(filename);

    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3, putCmd, { expiresIn: R2_EXPIRES });
    const publicUrl = R2_PUBLIC_BASE ? `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}` : null;

    res.json({
      key,
      url,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      publicUrl,
      expiresIn: R2_EXPIRES
    });
  } catch (err) {
    console.error('presign error', err);
    res.status(500).json({ error: 'presign_failed', message: String(err) });
  }
});

app.listen(PORT, () => {
  console.log('🚀 API en puerto', PORT);
});
