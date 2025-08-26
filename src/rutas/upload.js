// src/rutas/upload.js
const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const router = express.Router();

const REQUIRED = ["S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.warn("[S3] Faltan variables de entorno. Requeridas:", REQUIRED.join(", "));
}

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: !!process.env.S3_ENDPOINT
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.UPLOAD_MAX_MB || 5) * 1024 * 1024) },
  fileFilter: (req, file, cb) => {
    const allowed = (process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf")
      .split(",");
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido"));
    }
    cb(null, true);
  }
});

// POST /api/upload  (multipart form, campo: file)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "No se envió archivo" });
    const bucket = process.env.S3_BUCKET;
    const prefix = process.env.UPLOAD_PREFIX || "uploads";
    const key = `${prefix}/${Date.now()}_${req.file.originalname}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    });

    await s3.send(cmd);

    const url = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${bucket}/${key}`
      : `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${encodeURIComponent(key)}`;

    res.json({ ok: true, bucket, key, url, size: req.file.size, mimetype: req.file.mimetype });
  } catch (err) {
    console.error("❌ Error en subida:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/upload/presign?key=filename.ext&contentType=...
router.get("/upload/presign", async (req, res) => {
  try {
    const bucket = process.env.S3_BUCKET;
    const prefix = process.env.UPLOAD_PREFIX || "uploads";
    const key = req.query.key || `${prefix}/${Date.now()}_upload.bin`;
    const contentType = req.query.contentType || "application/octet-stream";

    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });

    return res.json({ ok: true, bucket, key, url });
  } catch (err) {
    console.error("❌ Error presign:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DEBUG: ver si Render lee las vars S3 (no imprime secretos)
router.get("/debug/env-s3", (_req, res) => {
  res.json({
    ok: true,
    S3_REGION: process.env.S3_REGION || null,
    S3_BUCKET: process.env.S3_BUCKET || null,
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ? "set" : "missing",
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ? "set" : "missing",
    S3_ENDPOINT: process.env.S3_ENDPOINT ? "set" : "empty"
  });
});

module.exports = router;
