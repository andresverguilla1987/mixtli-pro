const express = require("express");
const router = express.Router();
const multer = require("multer");

// Guardado en memoria (no escribe a disco)
const upload = multer({ storage: multer.memoryStorage() });

const { uploadBufferToS3 } = require("../servicios/s3");

// POST /api/upload  (form-data con 'file')
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Falta el archivo (form-data 'file')" });
    }
    const result = await uploadBufferToS3(req.file);
    res.json({ mensaje: "Archivo subido con éxito ✅", ...result });
  } catch (err) {
    console.error("[/api/upload] Error:", err);
    res.status(500).json({ error: "Error al subir el archivo a S3" });
  }
});

module.exports = router;
