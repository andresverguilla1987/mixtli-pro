// server.js — Mixtli API (clean)
// Endpoints: GET /salud, POST /api/upload (form-data: file)

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();

// --- Config básica ---
app.use(cors());
app.use(express.json({ limit: "1mb" })); // No subas archivos por JSON, solo metadatos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// --- Salud ---
app.get("/salud", (_req, res) => {
  res.json({ ok: true, msg: "Mixtli API viva 🟢" });
});

// --- S3 Client (lee ENV del runtime) ---
const S3_REGION = process.env.S3_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID || "",
    secretAccessKey: AWS_SECRET_ACCESS_KEY || "",
  },
});

// --- Util: nombre seguro ---
const safeName = (name = "archivo") =>
  name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

// --- Upload: POST /api/upload (Body -> form-data -> key: file, Type: File) ---
app.post("/api/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "Falta el archivo (form-data 'file')" });
    if (!S3_REGION || !S3_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      return res.status(500).json({ ok: false, error: "Faltan variables de entorno S3" });
    }

    const key = `uploads/${Date.now()}-${safeName(req.file.originalname)}`;
    const cmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || "application/octet-stream",
      ACL: "public-read", // si tu bucket no es público, quítalo
    });

    await s3.send(cmd);
    const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodeURIComponent(key)}`;

    return res.status(200).json({
      ok: true,
      key,
      url,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    // Manejo de límite de tamaño
    if (err && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ ok: false, error: "Archivo demasiado grande", max: "20MB" });
    }
    return next(err);
  }
});

// --- 404 JSON ---
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada", path: req.originalUrl });
});

// --- Error handler JSON ---
app.use((err, _req, res, _next) => {
  console.error("ERROR:", err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || "Error interno", status });
});

// --- Arranque ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Mixtli API escuchando en puerto ${PORT}`);
});
