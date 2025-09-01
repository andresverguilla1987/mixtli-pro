// src/rutas/uploads.js (CommonJS)
const express = require('express');
const { s3, ensureBucketCors, partSizeFor } = require('../lib/s3');
const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();
const { S3_BUCKET } = process.env;

function guardConfigured(res) {
  if (!S3_BUCKET) {
    res.status(501).json({ error: 'Uploads no configurados. Falta S3_BUCKET/credenciales.' });
    return false;
  }
  return true;
}

router.post('/multipart/init', async (req, res) => {
  try {
    if (!guardConfigured(res)) return;
    const { filename, contentType, size } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: 'filename y contentType requeridos' });

    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;
    const partSize = partSizeFor(size);
    const origin = req.headers.origin;
    await ensureBucketCors(origin);

    const cmd = new CreateMultipartUploadCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const out = await s3.send(cmd);

    res.json({
      uploadId: out.UploadId,
      key,
      bucket: S3_BUCKET,
      partSize,
    });
  } catch (err) {
    console.error('init error:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

router.get('/multipart/sign-part', async (req, res) => {
  try {
    if (!guardConfigured(res)) return;
    const { key, uploadId, partNumber } = req.query;
    if (!key || !uploadId || !partNumber) return res.status(400).json({ error: 'key, uploadId, partNumber requeridos' });

    const cmd = new UploadPartCommand({
      Bucket: S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      PartNumber: Number(partNumber),
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
    res.json({ url });
  } catch (err) {
    console.error('sign-part error:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

router.post('/multipart/complete', async (req, res) => {
  try {
    if (!guardConfigured(res)) return;
    const { key, uploadId, parts } = req.body || {};
    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'key, uploadId y parts[] requeridos' });
    }
    const cmd = new CompleteMultipartUploadCommand({
      Bucket: S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.map(p => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) })) }
    });
    const out = await s3.send(cmd);
    res.json({ ok: true, location: out.Location, key: out.Key, bucket: out.Bucket, etag: out.ETag });
  } catch (err) {
    console.error('complete error:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

router.post('/multipart/abort', async (req, res) => {
  try {
    if (!guardConfigured(res)) return;
    const { key, uploadId } = req.body || {};
    if (!key || !uploadId) return res.status(400).json({ error: 'key y uploadId requeridos' });
    const cmd = new AbortMultipartUploadCommand({ Bucket: S3_BUCKET, Key: key, UploadId: uploadId });
    await s3.send(cmd);
    res.json({ ok: true });
  } catch (err) {
    console.error('abort error:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

module.exports = router;
