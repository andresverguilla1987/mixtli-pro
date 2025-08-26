// src/rutas/upload.js
const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();

// Validación de variables S3
const required = ["S3_REGION","S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY"];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.warn("[S3] Faltan variables de entorno. Requeridas: S3_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY".replace("AWS_","S3_"));
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.UPLOAD_MAX_MB) || 5) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = (process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf").split(",");
    if (!allowed.includes(file.mimetype)) return cb(new Error("Tipo de archivo no permitido"));
    cb(null, true);
  }
});

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: !!process.env.S3_ENDPOINT
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "No se envió archivo" });

    const bucket = process.env.S3_BUCKET;
    const prefix = process.env.UPLOAD_PREFIX || "uploads";
    const safeName = encodeURIComponent(req.file.originalname).replace("%20", "+");
    const key = `${prefix}/${Date.now()}_${safeName}`;

    const putCmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
      // No usar ACL para buckets sin ACLs
    });

    await s3.send(putCmd);

    const url = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${bucket}/${key}`
      : `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

    res.json({ ok: true, bucket, key, url, size: req.file.size, mimetype: req.file.mimetype });
  } catch (err) {
    console.error("❌ Error en subida:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
