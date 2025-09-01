// src/rutas/uploads.js
const router = require('express').Router();
const {
  s3, BUCKET,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListObjectsV2Command,
  getSignedUrl
} = require('../lib/s3');

function requireS3(res){
  if (!BUCKET) { res.status(501).json({ error:'S3_BUCKET no configurado' }); return false; }
  return true;
}

// Init multipart
router.post('/multipart/init', async (req, res, next) => {
  try {
    if (!requireS3(res)) return;
    const { filename, contentType } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename requerido' });
    const key = `uploads/${Date.now()}_${filename}`;
    const out = await s3.send(new CreateMultipartUploadCommand({
      Bucket: BUCKET, Key: key, ContentType: contentType || 'application/octet-stream'
    }));
    res.json({ uploadId: out.UploadId, key, partSize: 10 * 1024 * 1024 });
  } catch (e) { next(e); }
});

// Sign each part
router.get('/multipart/sign-part', async (req, res, next) => {
  try {
    if (!requireS3(res)) return;
    const { key, uploadId, partNumber } = req.query || {};
    if (!key || !uploadId || !partNumber) return res.status(400).json({ error: 'key, uploadId, partNumber requeridos' });
    const cmd = new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: Number(partNumber) });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 900 });
    res.json({ url });
  } catch (e) { next(e); }
});

// Complete
router.post('/multipart/complete', async (req, res, next) => {
  try {
    if (!requireS3(res)) return;
    const { key, uploadId, parts } = req.body || {};
    if (!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ error: 'key, uploadId y parts[] requeridos' });
    const cmd = new CompleteMultipartUploadCommand({
      Bucket: BUCKET, Key: key, UploadId: uploadId,
      MultipartUpload: { Parts: parts.map(p => ({ ETag: p.etag, PartNumber: p.partNumber })) }
    });
    const out = await s3.send(cmd);
    const region = process.env.AWS_REGION || 'us-east-1';
    res.json({ ok:true, location:`https://${BUCKET}.s3.${region}.amazonaws.com/${key}`, etag: out.ETag });
  } catch (e) { next(e); }
});

// Abort
router.post('/multipart/abort', async (req, res, next) => {
  try {
    if (!requireS3(res)) return;
    const { key, uploadId } = req.body || {};
    if (!key || !uploadId) return res.status(400).json({ error: 'key y uploadId requeridos' });
    await s3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// List objects for files.html
router.get('/list', async (req, res, next) => {
  try {
    if (!requireS3(res)) return;
    const prefix = req.query.prefix || 'uploads/';
    const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, MaxKeys: 1000 }));
    const items = (out.Contents || []).map(o => ({ key:o.Key, size:o.Size, lastModified:o.LastModified }));
    res.json({ items });
  } catch (e) { next(e); }
});

module.exports = router;
