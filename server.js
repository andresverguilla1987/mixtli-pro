
import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import pino from 'pino';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Database from 'better-sqlite3';
import sgMail from '@sendgrid/mail';

const env = {
  port: Number(process.env.PORT || 10000),
  jwt: process.env.JWT_SECRET || 'devsecret',
  driver: process.env.STORAGE_DRIVER || 'R2',
  // S3
  s3: {
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  },
  // R2
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    bucket: process.env.R2_BUCKET,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL
  },
  // SendGrid
  sendgridKey: process.env.SENDGRID_API_KEY,
  mailFrom: process.env.MAIL_FROM || 'Mixtli <noreply@example.com>',
  // TTL
  defaultTtlDays: Number(process.env.DEFAULT_TTL_DAYS || 14),
  // Limits
  maxFree: Number(process.env.PLAN_FREE_MAX || 50*1024*1024),
  maxPro: Number(process.env.PLAN_PRO_MAX || 2*1024*1024*1024),
  maxEnt: Number(process.env.PLAN_ENTERPRISE_MAX || 10*1024*1024*1024),
}

const logger = pino({ level: 'info', base: undefined });

// DB (lite)
const db = new Database('mixtli-mini.db');
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  pass TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'FREE',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  bucket TEXT NOT NULL,
  ukey TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  etag TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const stmtUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtCreateUser = db.prepare('INSERT INTO users (id,email,pass,plan) VALUES (?,?,?,?)');
const stmtCreateUpload = db.prepare(`INSERT INTO uploads (id,userId,bucket,ukey,size,mime,expiresAt) VALUES (?,?,?,?,?,?,?)`);
const stmtUploadById = db.prepare('SELECT * FROM uploads WHERE id = ? AND userId = ?');
const stmtMarkUploaded = db.prepare("UPDATE uploads SET status='READY', etag=? WHERE id=?");
const stmtExpired = db.prepare("SELECT id, ukey FROM uploads WHERE datetime(expiresAt) < datetime('now')");
const stmtDeleteUpload = db.prepare("DELETE FROM uploads WHERE id=?");

function s3Client() {
  if (env.driver === 'S3') {
    return new S3Client({
      region: env.s3.region,
      credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
    });
  } else if (env.driver === 'R2') {
    return new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey }
    });
  }
  throw new Error('Invalid STORAGE_DRIVER');
}

function bucket() {
  return env.driver === 'S3' ? env.s3.bucket : env.r2.bucket;
}

function planMax(plan) {
  if (plan === 'PRO') return env.maxPro;
  if (plan === 'ENTERPRISE') return env.maxEnt;
  return env.maxFree;
}

function forbiddenExt(filename) {
  const bad = ['.exe','.bat','.cmd','.scr','.ps1','.js','.vbs','.jar'];
  const lower = filename.toLowerCase();
  return bad.some(ext=> lower.endsWith(ext));
}

// --- App ---
const app = express();
app.use(express.json({ limit: '1mb' }));

// request-id
app.use((req,res,next)=>{
  const rid = req.headers['x-request-id'] || cryptoRandom();
  req.id = rid;
  res.setHeader('x-request-id', rid);
  next();
});

// access log
app.use((req,res,next)=>{
  logger.info({rid:req.id, m:req.method, url:req.url}, 'req');
  res.on('finish', ()=> logger.info({rid:req.id, s:res.statusCode}, 'res'));
  next();
});

app.get('/api/health', (req,res)=> res.json({status:'ok', driver: env.driver}));

// Auth
app.post('/auth/register', (req,res)=>{
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error:'email and password required'});
  const exists = stmtUserByEmail.get(email);
  if (exists) return res.status(409).json({ error:'email already registered'});
  const hash = bcrypt.hashSync(password, 10);
  const id = nanoid();
  stmtCreateUser.run(id, email, hash, 'FREE');
  return res.json({ ok:true, user:{ id, email, plan:'FREE' } });
});

app.post('/auth/login', (req,res)=>{
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error:'email and password required'});
  const u = stmtUserByEmail.get(email);
  if (!u) return res.status(401).json({ error:'invalid credentials'});
  const ok = bcrypt.compareSync(password, u.pass);
  if (!ok) return res.status(401).json({ error:'invalid credentials'});
  const token = jwt.sign({ sub: u.id, email: u.email, plan: u.plan }, env.jwt, { expiresIn:'7d' });
  return res.json({ token });
});

function auth(req,res,next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')? header.slice(7): null;
  if (!token) return res.status(401).json({ error:'missing token'});
  try {
    const payload = jwt.verify(token, env.jwt);
    req.user = payload;
    next();
  } catch(e) {
    return res.status(401).json({ error:'invalid token'});
  }
}

// Presign upload
app.post('/upload/presign', auth, async (req,res)=>{
  const { filename, size, mime, ttlDays } = req.body || {};
  if (!filename || typeof size!=='number') return res.status(400).json({ error:'filename and size required' });
  if (size > planMax(req.user.plan)) return res.status(413).json({ error:`file too large for plan ${req.user.plan}` });
  if (forbiddenExt(filename)) return res.status(400).json({ error:'forbidden file extension' });

  const id = nanoid();
  const key = `${req.user.sub}/${new Date().toISOString().slice(0,10)}/${id}-${filename}`;
  const expiresAt = new Date(Date.now() + 1000*60*60*24*(ttlDays || env.defaultTtlDays));

  stmtCreateUpload.run(id, req.user.sub, bucket(), key, size, (mime||'application/octet-stream'), expiresAt.toISOString());

  const client = s3Client();
  const cmd = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: mime || 'application/octet-stream', ContentLength: size });
  const putUrl = await getSignedUrl(client, cmd, { expiresIn: 15*60 });
  res.json({ uploadId:id, key, putUrl, putExpiresAt: new Date(Date.now()+15*60*1000).toISOString(), ttlExpiresAt: expiresAt.toISOString() });
});

// Complete
app.post('/upload/complete', auth, async (req,res)=>{
  const { uploadId, etag } = req.body || {};
  const u = stmtUploadById.get(uploadId, req.user.sub);
  if (!u) return res.status(404).json({ error:'upload not found' });
  stmtMarkUploaded.run(etag || null, uploadId);
  res.json({ ok:true, uploadId });
});

// Get link (1h) — if R2_PUBLIC_BASE_URL dado, se usa público
app.get('/upload/:id/link', auth, async (req,res)=>{
  const u = stmtUploadById.get(req.params.id, req.user.sub);
  if (!u) return res.status(404).json({ error:'not found' });
  if (new Date(u.expiresAt) < new Date()) return res.status(410).json({ error:'expired' });

  // R2 público (opcional)
  if (env.driver==='R2' && env.r2.publicBaseUrl) {
    const url = `${env.r2.publicBaseUrl.replace(/\/$/,'')}/${encodeURIComponent(u.ukey)}`;
    return res.json({ url, public:true });
  }
  const client = s3Client();
  const cmd = new GetObjectCommand({ Bucket: u.bucket, Key: u.ukey });
  const url = await getSignedUrl(client, cmd, { expiresIn: 60*60 });
  res.json({ url, expiresIn: 3600 });
});

// Send email
app.post('/email/send', auth, async (req,res)=>{
  const { uploadId, to, message } = req.body || {};
  if (!to) return res.status(400).json({ error:'to required' });
  const u = stmtUploadById.get(uploadId, req.user.sub);
  if (!u) return res.status(404).json({ error:'upload not found' });
  if (new Date(u.expiresAt) < new Date()) return res.status(410).json({ error:'expired' });

  let url;
  if (env.driver==='R2' && env.r2.publicBaseUrl) {
    url = `${env.r2.publicBaseUrl.replace(/\/$/,'')}/${encodeURIComponent(u.ukey)}`;
  } else {
    const client = s3Client();
    url = await getSignedUrl(client, new GetObjectCommand({ Bucket: u.bucket, Key: u.ukey }), { expiresIn: 24*60*60 });
  }

  if (!env.sendgridKey) return res.status(500).json({ error:'SENDGRID_API_KEY not set' });
  sgMail.setApiKey(env.sendgridKey);
  await sgMail.send({
    to,
    from: env.mailFrom,
    subject: 'Te compartieron un archivo (Mixtli)',
    text: `Hola,\n\n${message||'Te compartieron un archivo.'}\n\nDescarga (expira en 24h):\n${url}\n`
  });
  res.json({ ok:true });
});

// Static tester
app.use('/', express.static('public'));

app.listen(env.port, ()=> logger.info({ port: env.port, driver: env.driver }, 'up'));

// --- helpers ---
function cryptoRandom() {
  // tiny request-id
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return [...arr].map(b=>b.toString(16).padStart(2,'0')).join('');
}
