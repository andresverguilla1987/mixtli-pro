// server.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de S3
const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const bucket = process.env.S3_BUCKET;

// Configuración de Multer
const upload = multer({ storage: multer.memoryStorage() });

// Ruta de salud
app.get("/salud", (req, res) => {
  res.json({ ok: true, msg: "Mixtli API viva 🌐" });
});

// Ruta de subida
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ningún archivo" });
    }

    const params = {
      Bucket: bucket,
      Key: Date.now() + "_" + req.file.originalname,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    await s3.send(new PutObjectCommand(params));

    res.json({
      ok: true,
      msg: "Archivo subido correctamente",
      file: params.Key
    });
  } catch (err) {
    console.error("Error al subir a S3:", err);
    res.status(500).json({ error: "Error al subir archivo" });
  }
});

// Arranque
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Mixtli API corriendo en puerto ${PORT}`);
});
