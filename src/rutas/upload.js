
// src/rutas/upload.js
const { Router } = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: (process.env.UPLOAD_MAX_MB || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = (process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf").split(",");
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido"));
    }
    cb(null, true);
  }
});

function getS3() {
  if (!process.env.S3_REGION || !process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    console.log("[S3] Faltan vars. Requeridas: S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!process.env.S3_ENDPOINT
  });
}

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No se envió archivo' });

    const s3 = getS3();
    const bucket = process.env.S3_BUCKET;
    const prefix = process.env.UPLOAD_PREFIX || 'uploads';
    const cleanName = (req.file.originalname || 'file').replace(/[^\w.\-]/g, '_');
    const key = `${prefix}/${Date.now()}_${cleanName}`;

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));

    const url = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT.replace(/\/+$/,'')}/${bucket}/${encodeURIComponent(key)}`
      : `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${encodeURIComponent(key)}`;

    res.json({ ok: true, bucket, key, url, size: req.file.size, mimetype: req.file.mimetype });
  } catch (err) {
    console.error("❌ Error en subida:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
