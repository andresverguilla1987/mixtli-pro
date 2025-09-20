// Mixtli Mini 1.15.2 — backend completo (mínimo viable)
import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// -------- Config --------
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || '';
const DEFAULT_READ_TTL = Math.min(Number(process.env.DEFAULT_READ_TTL || 300), 86400);
const SQLITE_FILE = process.env.SQLITE_FILE || './mixtli.db';

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_BUCKET = process.env.S3_BUCKET;
const S3_FORCE_PATH_STYLE = (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true';
const ALLOWED_ORIGINS = (() => { try { return JSON.parse(process.env.ALLOWED_ORIGINS || '[]'); } catch { return []; } })();

// -------- App --------
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(morgan('dev'));

// CORS simple
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!ALLOWED_ORIGINS.length) res.setHeader('Access-Control-Allow-Origin', origin || '*');
  else if (origin && ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// -------- DB --------
const db = await open({ filename: SQLITE_FILE, driver: sqlite3.Database });
await db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  passhash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  size INTEGER,
  contentType TEXT,
  sha256 TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  key TEXT NOT NULL,
  password TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at INTEGER NOT NULL
);
`);

// -------- S3 / R2 --------
const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: S3_FORCE_PATH_STYLE,
  credentials: (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
    ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
    : undefined
});

// -------- Helpers --------
function sign(uid, roles = ['uploader', 'viewer']) {
  if (!JWT_SECRET) return 'DEV_MODE_TOKEN'; // modo libre (no prod)
  return jwt.sign({ uid, roles }, JWT_SECRET, { expiresIn: '30d' });
}
function verifyToken(token) {
  if (!JWT_SECRET) return { uid: 'dev', roles: ['admin', 'uploader', 'viewer'] };
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    const data = token ? verifyToken(token) : null;
    if (!data && required) return res.status(401).json({ ok: false, error: 'unauthorized' });
    req.user = data || { uid: 'dev', roles: ['admin', 'uploader', 'viewer'] };
    next();
  };
}
const nowSec = () => Math.floor(Date.now() / 1000);
const clampTTL = (ttl) => Math.max(60, Math.min(Number(ttl || DEFAULT_READ_TTL), 86400)); // 1m..24h
const makeKeyFromFilename = (name) => {
  const id = Math.random().toString(16).slice(2, 8) + Math.random().toString(16).slice(2, 8);
  const ts = Date.now();
  return `${ts}_${id}_${name}`;
};

// -------- Rutas --------
app.get('/', (req, res) => res.type('text').send('Mixtli Mini'));
app.get('/version', (req, res) =>
  res.json({ ok: true, name: 'Mixtli Mini', version: '1.15.2',
    env: { s3Configured: !!(S3_ENDPOINT && S3_BUCKET), region: S3_REGION, pathStyle: S3_FORCE_PATH_STYLE } })
);
app.get('/api/health', (req, res) => res.json({ ok: true, auth: !!JWT_SECRET, s3: !!(S3_ENDPOINT && S3_BUCKET) }));

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: 'email/password requeridos' });
  try {
    const passhash = await bcrypt.hash(password, 10);
    await db.run(`INSERT INTO users(email, passhash) VALUES (?,?)`, [email, passhash]);
    const token = sign(email, ['admin', 'uploader', 'viewer']);
    res.json({ ok: true, token });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return res.status(409).json({ ok: false, error: 'email ya existe' });
    res.status(500).json({ ok: false, error: String(e) });
  }
});
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: 'email/password requeridos' });
  const row = await db.get(`SELECT * FROM users WHERE email=?`, [email]);
  if (!row) return res.status(401).json({ ok: false, error: 'credenciales' });
  const ok = await bcrypt.compare(password, row.passhash);
  if (!ok) return res.status(401).json({ ok: false, error: 'credenciales' });
  const token = sign(email, ['admin', 'uploader', 'viewer']);
  res.json({ ok: true, token });
});
app.get('/api/auth/me', auth(false), (req, res) => res.json({ ok: true, user: req.user }));

// Presign (PUT)
app.post('/api/presign', auth(false), async (req, res) => {
  let { filename, key, contentType } = req.body || {};
  if (!key) {
    if (!filename) return res.status(400).json({ ok: false, error: 'key o filename requerido' });
    key = makeKeyFromFilename(filename);
  }
  if (!contentType) contentType = 'application/octet-stream';
  const cmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min
  res.json({ ok: true, url, key });
});

// Commit (guardar metadata)
app.post('/api/commit', auth(false), async (req, res) => {
  const { key, size, contentType, sha256 } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: 'key requerido' });
  try {
    await db.run(
      `INSERT OR REPLACE INTO files(key,size,contentType,sha256) VALUES (?,?,?,?)`,
      [key, size || null, contentType || null, sha256 || null]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Readlink (URL directa; si el bucket es privado, usa /api/share)
app.get('/api/readlink', auth(false), async (req, res) => {
  const key = req.query.key;
  const ttl = clampTTL(req.query.ttl); // reservado si luego cambias a GET firmado
  if (!key) return res.status(400).json({ ok: false, error: 'key requerido' });
  const base = new URL(S3_ENDPOINT);
  const href = `${base.origin}/${S3_BUCKET}/${encodeURIComponent(key)}`;
  res.json({ ok: true, url: href, note: 'Si el bucket no es público, usa /api/share para público.' });
});

// Thumbnail (descarga, sharp, sube a thumbs/<key>.jpg)
app.post('/api/thumbnail', auth(false), async (req, res) => {
  const { key, width = 480, watermark = {} } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: 'key requerido' });
  const base = new URL(S3_ENDPOINT);
  const src = `${base.origin}/${S3_BUCKET}/${encodeURIComponent(key)}`;
  const r = await fetch(src);
  if (!r.ok) return res.status(404).json({ ok: false, error: 'no se pudo leer origen (haz bucket público o implementa GET firmado)' });
  const buf = Buffer.from(await r.arrayBuffer());
  let img = sharp(buf).rotate().resize({ width: Number(width) || 480, withoutEnlargement: true });
  if (watermark && watermark.text) {
    const opacity = Math.max(0, Math.min(Number(watermark.opacity || 0.2), 1));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300">
      <rect width="100%" height="100%" fill="none"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-size="72" fill="white" fill-opacity="${opacity}"
            font-family="sans-serif">${watermark.text}</text></svg>`;
    img = img.composite([{ input: Buffer.from(svg), gravity: (watermark.pos || 'southeast') }]);
  }
  const out = await img.jpeg({ quality: 85 }).toBuffer();
  const thumbKey = `thumbs/${key}.jpg`;
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: thumbKey, Body: out, ContentType: 'image/jpeg' }));
  res.json({ ok: true, thumbnailKey: thumbKey });
});

// Share (7 días por defecto) y página /s/:token
app.post('/api/share', auth(false), async (req, res) => {
  const { key, ttl = 604800, password = '' } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: 'key requerido' });
  const token = crypto.randomBytes(16).toString('hex');
  const expires_at = nowSec() + Math.min(Number(ttl) || 604800, 604800); // cap 7 días
  await db.run(`INSERT INTO shares(token,key,password,expires_at) VALUES (?,?,?,?)`,
    [token, key, password || '', expires_at]);
  res.json({ ok: true, token, url: `/s/${token}` });
});
app.get('/s/:token', async (req, res) => {
  const t = req.params.token;
  const row = await db.get(`SELECT * FROM shares WHERE token=?`, [t]);
  if (!row) return res.status(404).type('text').send('Not Found');
  if (row.expires_at < nowSec()) return res.status(410).type('text').send('Expired');
  const base = new URL(S3_ENDPOINT);
  const href = `${base.origin}/${S3_BUCKET}/${encodeURIComponent(row.key)}`;
  res.redirect(href);
});

// -------- Start --------
app.listen(PORT, () => console.log(`Mixtli Mini 1.15.2 on :${PORT}`));
