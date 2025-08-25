const express = require("express");
const multer = require("multer");
const { putObject } = require("../servicios/s3");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload (campo esperado: "file")
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Falta el archivo (form-data 'file')" });
    }
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;

    const result = await putObject({
      key: filename,
      body: req.file.buffer,
      contentType: req.file.mimetype || "application/octet-stream",
    });

    return res.json({ ok: true, key: filename, location: result.location });
  } catch (err) {
    console.error("Error en /api/upload:", err);
    return res.status(500).json({ ok: false, error: err.message || "Error interno" });
  }
});

module.exports = router;
