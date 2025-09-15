'use strict';
/**
 * Ejemplo mínimo de server Express con R2 (S3 compatible)
 * Endpoints: /salud, /api/presign (PUT), /api/list
 * Usa env-resolver.js para cargar variables y crear el cliente.
 */
const express = require('express');
const { getEnv, logEnvSafe, assertEnv, buildS3Client } = require('./env-resolver');
const { attachDebug } = require('./routes-debug');
const { PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { S3RequestPresigner } = require('@aws-sdk/s3-request-presigner');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const { Hash } = require('@smithy/hash-node');
const { formatUrl } = require('@aws-sdk/util-format-url');

const ENV = getEnv();
logEnvSafe(ENV);
assertEnv(ENV);

const s3 = buildS3Client(ENV);
const BUCKET = ENV.S3_BUCKET;

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  const origins = Array.isArray(ENV.ALLOWED_ORIGINS) ? ENV.ALLOWED_ORIGINS : [];
  const origin = req.headers.origin;
  if (origin && origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-mixtli-token');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/salud', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/presign', async (req, res) => {
  try {
    const { key, contentType = 'application/octet-stream', method = 'PUT' } = req.body || {};
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'BadRequest', message: 'key requerido' });
    if (method !== 'PUT') return res.status(400).json({ error: 'BadRequest', message: 'solo soportado: PUT' });

    const presigner = new S3RequestPresigner({ ...s3.config, sha256: Hash.bind(null, 'sha256') });
    const reqToSign = new HttpRequest({
      ...s3.config,
      protocol: 'https:',
      method: 'PUT',
      path: `/${BUCKET}/${encodeURIComponent(key)}`,
      headers: { 'content-type': contentType },
      hostname: process.env.S3_ENDPOINT.replace(/^https?:\/\//, '')
    });
    const signed = await presigner.presign(reqToSign, { expiresIn: 300 });
    const url = formatUrl(signed);
    res.json({ url, key });
  } catch (e) {
    console.error('presign error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

app.get('/api/list', async (req, res) => {
  try {
    const prefix = (req.query.prefix || '').toString();
    const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix || undefined }));
    const objects = (out.Contents || []).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
    res.json(objects);
  } catch (e) {
    console.error('list error:', e);
    res.status(500).json({ error: 'ServerError', message: e.message });
  }
});

attachDebug(app, ENV);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Mixtli server.example listening on :' + PORT));
