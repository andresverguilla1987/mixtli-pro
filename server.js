const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Salud
app.get("/salud", (_req, res) => {
  res.json({ ok: true, msg: "Mixtli API viva 🟢" });
});

// DEBUG: ver si Render lee las vars S3 (no imprime secretos)
app.get("/debug/env-s3", (_req, res) => {
  res.json({
    ok: true,
    S3_REGION: process.env.S3_REGION || null,
    S3_BUCKET: process.env.S3_BUCKET || null,
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ? "set" : "missing",
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ? "set" : "missing",
    S3_ENDPOINT: process.env.S3_ENDPOINT ? "set" : "empty"
  });
});

// Rutas de upload
const uploadRoutes = require("./src/rutas/upload");
app.use("/api", uploadRoutes);

// 404 JSON
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada", path: req.originalUrl });
});

// Error handler JSON
app.use((err, _req, res, _next) => {
  console.error("❌ Error handler:", err);
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ ok: false, error: "Archivo demasiado grande", maxMB: Number(process.env.UPLOAD_MAX_MB || 5) });
  }
  if (err && /no permitido/i.test(err.message || "")) {
    return res.status(400).json({ ok: false, error: err.message });
  }
  res.status(err.status || 500).json({ ok: false, error: err.message || "Error interno" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`));
