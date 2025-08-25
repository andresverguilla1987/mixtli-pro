// server.js — Mixtli API (clean + S3 listo)
// Endpoints: GET /salud, GET /api/s3/test, POST /api/upload (form-data: file)

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { S3Client, PutObjectCommand, ListBucketsCommand } = require("@aws-sdk/client-s3");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ====== ENV (usa exactamente estos nombres que ya configuraste en Render) ======
const S3_REGION  = process.env.S3_REGION;
const S3_BUCKET  = process.env.S3_BUCKET;
const S3_AKI     = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET  = process.env.S3_SECRET_ACCESS_KEY;

// S3 client
const s3 = new S3Client({
  region: S3_REGION,
  credentials: { accessKeyId: S3_AKI || "", secretAccessKey: S3_SECRET || "" }
});

// Multer (memoria, 20 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Util para nombres seguros
const safeName = (name = "archivo") =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

// ====== Salud ======
app.get("/salud", (_req, res) => {
  res.json({ ok: true, msg: "Mixtli API viva 🟢" });
});

// ====== Test S3 (para validar credenciales/región) ======
app.get("/api/s3/test", async (_req, res, next) => {
  try {
    if (!S3_REGION || !S3_BUCKET || !S3_AKI || !S3_SECRET) {
      return res.status(500).json({ ok: false, error: "Faltan variables S3 (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION)" });
    }
    const out = await s3.send(new ListBucketsCommand({}));
    res.json({
      ok: true,
      region: S3_REGION,
      bucket: S3_BUCKET,
      buckets: (out.Buckets || []).map(b => b.Name)
    });
  } catch (err) { next(err); }
});

// ====== Upload a S3 ======
app.post("/api/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!S3_REGION || !S3_BUCKET || !S3_AKI || !S3_SECRET) {
      return res.status(500).json({ ok: false, error: "Faltan variables S3 (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION)" });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Falta el archivo (Body → form-data → key: file)" });
    }

    const key = `uploads/${Date.now()}-${safeName(req.file.originalname)}`;
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || "application/octet-stream",
      ACL: "public-read" // si tu bucket no es público, quita esta línea
    }));

    const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
    res.status(200).json({ ok: true, key, url, size: req.file.size, mimetype: req.file.mimetype });
  } catch (err) {
    if (err && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ ok: false, error: "Archivo demasiado grande", max: "20MB" });
    }
    next(err);
  }
});

// ====== 404 JSON ======
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada", path: req.originalUrl });
});

// ====== Error handler JSON ======
app.use((err, _req, res, _next) => {
  console.error("ERROR:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ ok: false, error: err.message || "Error interno", status });
});

// ====== Arranque ======
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Mixtli API en puerto ${PORT}`));
