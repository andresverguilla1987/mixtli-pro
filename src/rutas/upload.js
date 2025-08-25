const express = require("express");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: (process.env.UPLOAD_MAX_MB || 5) * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = (process.env.ALLOWED_MIME || "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf")
      .split(",");
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido"));
    }
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
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No se envió archivo" });
    }

    const bucket = process.env.S3_BUCKET;
    const prefix = process.env.UPLOAD_PREFIX || "uploads";
    const key = `${prefix}/${Date.now()}_${req.file.originalname}`;

    const putCmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    });

    await s3.send(putCmd);

    // FIX: encode solo el nombre, no el slash
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    let url;
    if (process.env.S3_ENDPOINT) {
      url = `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucket}/${encodedKey}`;
    } else {
      url = `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${encodedKey}`;
    }

    res.json({
      ok: true,
      bucket,
      key,
      url,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

  } catch (err) {
    console.error("❌ Error en subida:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
