// server.js — Mixtli API PRO + /api/list
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import client from 'prom-client';
import swaggerUi from 'swagger-ui-express';

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
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN || 100);

// Parsers
app.use('/api/upload', express.raw({ type: '*/*', limit: MAX_BYTES }));
app.use(express.json({ limit: '5mb' }));

// Rate limit (simple)
const winMs = 60_000;
const bucket = new Map();
function rateKey(req){
  const t = req.get('x-mixtli-token');
  if (t) return 'tok:' + t;
  const xff = (req.get('x-forwarded-for') || '').split(',')[0].trim();
  return 'ip:' + (xff || req.socket.remoteAddress || 'unknown');
}
function rateLimit(req,res,next){
  const k = rateKey(req);
  const now = Date.now();
  const arr = bucket.get(k) || [];
  const pruned = arr.filter(ts => now - ts < winMs);
  if (pruned.length >= RATE_LIMIT_PER_MIN){
    const retry = Math.ceil((winMs - (now - pruned[0]))/1000);
    res.set('Retry-After', String(retry));
    return res.status(429).json({ error:'rate_limited', retryAfter: retry });
  }
  pruned.push(now);
  bucket.set(k, pruned);
  next();
}

// Auth helper
function requireToken(req,res,next){
  if (!TOKEN) return next();
  const t = req.get('x-mixtli-token') || '';
  if (t !== TOKEN) return res.status(401).json({ error:'unauthorized' });
  next();
}

// S3 (R2)
const s3 = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const uploadsTotal = new client.Counter({ name:'mixtli_uploads_total', help:'Total uploads'});
const uploadBytes = new client.Counter({ name:'mixtli_upload_bytes_total', help:'Total uploaded bytes'});
register.registerMetric(uploadsTotal);
register.registerMetric(uploadBytes);

// OpenAPI (minimal)
const openapi = {
  openapi: '3.0.3',
  info: { title:'Mixtli API', version:'1.1.0' },
  paths: {
    '/api/health': { get: { responses: { '200': { description:'OK' } } } },
    '/api/list': { get: { responses: { '200': { description:'OK' } } } },
    '/api/upload': { post: { responses: { '200': { description:'OK' } } } }
  }
};
app.get('/openapi.json', (_req,res)=> res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

// Health
app.get('/api/health', (_req,res)=> res.json({ ok:true, mode:'server-upload', time:new Date().toISOString() }));

// Whoami (token check)
app.get('/api/whoami', (req,res)=>{
  if (!TOKEN) return res.json({ ok:true, auth:false, note:'API_TOKEN not set' });
  const hdr = req.get('x-mixtli-token') || '';
  if (hdr !== TOKEN) return res.status(401).json({ ok:false, auth:false });
  res.json({ ok:true, auth:true });
});

function sanitizeFilename(name){
  const base = path.basename(name).replace(/\s+/g,'-').replace(/[^A-Za-z0-9._-]/g,'');
  return base.length ? base.slice(-200) : 'file.bin';
}

// Upload
app.post(['/api/upload','/upload'], rateLimit, requireToken, async (req, res) => {
  try{
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

    uploadsTotal.inc();
    if (req.body && typeof req.body.length === 'number') uploadBytes.inc(req.body.length);

    res.json({ status:'ok', key, downloadUrl, publicUrl });
  }catch(e){
    console.error(e);
    res.status(500).json({ error:'upload_failed', message:String(e) });
  }
});

// List objects
app.get('/api/list', rateLimit, requireToken, async (req, res) => {
  try{
    const prefix = (req.query.prefix || PREFIX).toString().replace(/^\/+/,''); // default to KEY_PREFIX
    const maxKeys = Math.min(Number(req.query.max || 50), 1000);
    const token = req.query.token ? req.query.token.toString() : undefined;

    const out = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      Prefix: prefix.endsWith('/') ? prefix : prefix + '/',
      MaxKeys: maxKeys,
      ContinuationToken: token
    }));

    const pubBase = process.env.PUBLIC_BASE_URL || null;
    const items = (out.Contents || []).filter(o=>o.Key && !o.Key.endsWith('/')).map(o => ({
      key: o.Key,
      size: o.Size,
      lastModified: o.LastModified ? new Date(o.LastModified).toISOString() : null,
      publicUrl: pubBase ? `${pubBase.replace(/\/$/,'')}/${encodeURIComponent(o.Key)}` : null
    }));

    res.json({
      ok: true,
      prefix,
      items,
      isTruncated: !!out.IsTruncated,
      nextToken: out.NextContinuationToken || null
    });
  }catch(e){
    console.error(e);
    res.status(500).json({ error:'list_failed', message:String(e) });
  }
});

// Metrics
app.get('/metrics', async (_req,res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const port = process.env.PORT || 10000;
app.listen(port, ()=>console.log('Mixtli PRO+list on :' + port));
