const express = require("express");
const multer  = require("multer");
const { subirArchivo } = require("../servicios/s3");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Falta el archivo (form-data 'file')" });
    }
    const nombre = req.file.originalname.replace(/[\s]+/g, "_");
    const stamp = Date.now();
    const key = `uploads/${stamp}-${nombre}`;
    const url = await subirArchivo({ buffer: req.file.buffer, mimetype: req.file.mimetype, key });
    res.json({ ok: true, url, key, size: req.file.size, mimetype: req.file.mimetype });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Fallo al subir", detail: err?.message });
  }
});

module.exports = router;
