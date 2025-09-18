// routes/mixtli-mkdir-route.js
// Add-on de ruta para crear "carpetas" (prefijos) en Cloudflare R2/S3.
// Uso: en server.js -> const mkdirRoutes = require("./routes/mixtli-mkdir-route")(s3, bucket);
//                            app.use(mkdirRoutes);

const express = require("express");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

module.exports = function (s3, bucket) {
  const router = express.Router();

  // POST /api/mkdir  { "key": "postman/pruebas/" }
  router.post("/api/mkdir", async (req, res) => {
    try {
      let { key } = req.body || {};
      if (!key || typeof key !== "string") {
        return res.status(400).json({ ok: false, error: "Falta 'key' (string)" });
      }

      // Normaliza a sufijo "/"
      if (!key.endsWith("/")) key += "/";

      // En S3/R2 "carpeta" = prefijo; creamos un objeto vacío para materializarla
      const placeholder = `${key}.keep`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: placeholder,
          Body: "",
          ContentType: "application/octet-stream",
        })
      );

      return res.status(200).json({ ok: true, folder: key, placeholder });
    } catch (err) {
      console.error("mkdir error:", err);
      return res
        .status(500)
        .json({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  });

  return router;
};
