const express = require("express");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const router = express.Router();

// Multer (memoria) con límites
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.UPLOAD_MAX_MB || 5)) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = (process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf")
      .split(",").map(s => s.trim());
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido"));
    }
    cb(null, true);
  }
});

// Cliente S3
const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined, // vacío para AWS nativo
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: !!process.env.S3_ENDPOINT, // true en MinIO/R2
});

const bucket = process.env.S3_BUCKET;

// POST /api/upload (campo 'file')
router.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "No se envió archivo" });
    if (!bucket) return res.status(500).json({ ok: false, error: "Falta variable S3_BUCKET" });

    const prefix = (process.env.UPLOAD_PREFIX || "uploads").replace(/^\/+|\/+$/g, "");
    const safe = (req.file.originalname || "archivo").replace(/[^\w.\-]/g, "_");
    const key = `${prefix}/${Date.now()}_${safe}`;

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
      // Sin ACL (buckets modernos bloquean ACLs)
    }));

    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    const url = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucket}/${encodedKey}`
      : `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${encodedKey}`;

    res.json({ ok: true, bucket, key, url, size: req.file.size, mimetype: req.file.mimetype });
  } catch (err) { next(err); }
});

// GET /api/files  (lista)
router.get("/files", async (_req, res, next) => {
  try {
    const prefix = (process.env.UPLOAD_PREFIX || "uploads").replace(/^\/+|\/+$/g, "");
    const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 50 }));
    const files = (out.Contents || []).map(o => ({
      key: o.Key, size: o.Size, lastModified: o.LastModified
    }));
    res.json({ ok: true, count: files.length, files });
  } catch (err) { next(err); }
});

// GET /api/file-url?key=...
router.get("/file-url", async (req, res, next) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ ok: false, error: "Falta query ?key=" });
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
    res.json({ ok: true, key, url, expiresInSec: 300 });
  } catch (err) { next(err); }
});

// DELETE /api/file?key=...
router.delete("/file", async (req, res, next) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ ok: false, error: "Falta query ?key=" });
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    res.json({ ok: true, deleted: key });
  } catch (err) { next(err); }
});

module.exports = router;
