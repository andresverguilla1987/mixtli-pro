import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();
app.use(express.json({ limit: '1mb' }));

// === CORS (whitelist estricto) ===
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'https://lovely-bienenstitch-6344a1.netlify.app')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // permite curl/healthchecks
    if (ALLOWED.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin bloqueado: ' + origin));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS','HEAD'],
  allowedHeaders: ['Content-Type','x-mixtli-token'], // agrega aquí si ocupas más
  credentials: false,
  maxAge: 86400,
}));

// Preflight 204 rápido
app.options('*', (req, res) => res.status(204).end());

// === Health ===
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// === AWS S3 (R2) client ===
function makeS3() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Faltan credenciales R2 en .env');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

const s3 = makeS3();

// === Util: generar key seguro y "plano" ===
function extFromName(name='') {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '';
}
function safeKey(filename='file.bin') {
  const stamp = Date.now();
  const rand = crypto.randomBytes(6).toString('hex');
  const ext = extFromName(filename).toLowerCase().slice(0, 10); // evita extensiones locas
  return `${stamp}-${rand}${ext}`;
}

// === Límite 50 MB (no subimos al backend; solo validamos tamaño reportado) ===
const MAX_BYTES = 50 * 1024 * 1024;

// === Presign PUT ===
app.post('/api/presign', async (req, res) => {
  try {
    const { filename, type, size } = req.body || {};
    if (typeof size !== 'number' || size <= 0) {
      return res.status(400).json({ error: 'size requerido (bytes)' });
    }
    if (size > MAX_BYTES) {
      return res.status(413).json({ error: 'Archivo excede 50 MB' });
    }
    const Bucket = process.env.R2_BUCKET;
    if (!Bucket) return res.status(500).json({ error: 'Falta R2_BUCKET' });

    const Key = safeKey(filename);
    const ContentType = typeof type === 'string' && type ? type : 'application/octet-stream';

    const command = new PutObjectCommand({ Bucket, Key, ContentType });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 60 }); // 1h

    // URL pública (solo referencia; depende de permisos del bucket si no es presign GET)
    const publicBase = process.env.R2_PUBLIC_BASE || `https://${Bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const publicUrl = `${publicBase}/${Key}`;

    res.json({ url, key: Key, bucket: Bucket, publicUrl, expiresIn: 3600 });
  } catch (err) {
    console.error('presign error:', err);
    res.status(500).json({ error: 'presign failed', detail: String(err?.message || err) });
  }
});

// === Estáticos opcionales para probar (upload.html) ===
app.use('/', express.static('public', {
  extensions: ['html'],
  maxAge: 0,
}));

// === Inicio ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Mixtli API on :${PORT}`);
});
