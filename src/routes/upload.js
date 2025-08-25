
const express = require("express");
const multer = require("multer");
const { uploadBuffer, createPresignedUrl } = require("../services/s3");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload  (form-data: file=<archivo>)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Falta 'file' en form-data" });
    }
    const result = await uploadBuffer(req.file);
    res.json({ url: result.Location, key: result.Key });
  } catch (err) {
    console.error("[/api/upload] Error:", err);
    res.status(500).json({ error: "Error al subir archivo", detail: err.message });
  }
});

// GET /api/upload-url?filename=foo.png&contentType=image/png
router.get("/upload-url", async (req, res) => {
  try {
    const { filename, contentType } = req.query;
    const { url, Key } = await createPresignedUrl(filename || "file.bin", contentType);
    res.json({ url, key: Key });
  } catch (err) {
    console.error("[/api/upload-url] Error:", err);
    res.status(500).json({ error: "No se pudo generar URL prefirmada", detail: err.message });
  }
});

module.exports = router;
