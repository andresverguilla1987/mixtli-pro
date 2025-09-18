// routes/mixtli-featurepack-a.js
// Add-on de rutas para Mixtli (Cloudflare R2 compatible S3)
// Endpoints: mkdir, share (create/get/post/list/revoke), move, delete(object), trash(restore/empty - stub)
//
// Requisitos: express, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
// Montaje en server.js (CommonJS):
//   const featurePack = require("./routes/mixtli-featurepack-a")(s3, bucket, getSignedUrl);
//   app.use(featurePack);

const express = require("express");
const crypto = require("crypto");
const {
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand, // solo para tipo, no se envía directo (se usa en presigner)
  CopyObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

module.exports = function (s3, bucket, getSignedUrl) {
  const router = express.Router();
  router.use(express.json());

  // util
  const need = (v, name) => {
    if (!v || typeof v !== "string" || !v.trim()) {
      const e = new Error(`Falta '${name}'`);
      e.status = 400;
      throw e;
    }
  };

  // ==============================================
  // /api/mkdir  (crear "carpeta" = prefijo con placeholder)
  // Body: { key: "postman/pruebas/" }
  // ==============================================
  router.post("/api/mkdir", async (req, res, next) => {
    try {
      let { key } = req.body || {};
      need(key, "key");
      if (!key.endsWith("/")) key += "/";
      const placeholder = `${key}.keep`;
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: placeholder,
        Body: "",
        ContentType: "application/octet-stream"
      }));
      res.json({ ok: true, folder: key, placeholder });
    } catch (err) { next(err); }
  });

  // ==============================================
  // SHARES (memoria - no persistente)
  // ==============================================
  const shares = new Map();
  const sha256 = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

  // 08) crear
  // Body: { key, expiresSec=900, password="", maxDownloads=0 }
  router.post("/api/share/create", async (req, res, next) => {
    try {
      const { key, expiresSec = 900, password = "", maxDownloads = 0 } = req.body || {};
      need(key, "key");
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); // valida que exista
      const id = crypto.randomBytes(8).toString("hex");
      shares.set(id, {
        key, expiresSec: Number(expiresSec)||900,
        passwordHash: password ? sha256(password) : "",
        maxDownloads: Number(maxDownloads)||0, downloads: 0,
        createdAt: Date.now()
      });
      res.json({ ok: true, id });
    } catch (err) { next(err); }
  });

  // 09) resolver SIN password
  router.get("/api/share/:id", async (req, res, next) => {
    try {
      const sh = shares.get(req.params.id);
      if (!sh) return res.status(404).json({ error: "ShareNotFound" });
      const url = await getSignedUrl(
        s3,
        new (require("@aws-sdk/client-s3").GetObjectCommand)({ Bucket: bucket, Key: sh.key }),
        { expiresIn: sh.expiresSec }
      );
      res.json({ ok: true, id: req.params.id, key: sh.key, url });
    } catch (err) { next(err); }
  });

  // 10) resolver CON password (Body: { password })
  router.post("/api/share/:id", async (req, res, next) => {
    try {
      const sh = shares.get(req.params.id);
      if (!sh) return res.status(404).json({ error: "ShareNotFound" });
      const { password = "" } = req.body || {};
      const hash = password ? sha256(password) : "";
      if (sh.passwordHash && sh.passwordHash !== hash) {
        return res.status(401).json({ error: "PasswordMismatch" });
      }
      if (sh.maxDownloads > 0 && sh.downloads >= sh.maxDownloads) {
        return res.status(429).json({ error: "MaxDownloadsReached" });
      }
      const url = await getSignedUrl(
        s3,
        new (require("@aws-sdk/client-s3").GetObjectCommand)({ Bucket: bucket, Key: sh.key }),
        { expiresIn: sh.expiresSec }
      );
      sh.downloads++;
      res.json({ ok: true, id: req.params.id, key: sh.key, url });
    } catch (err) { next(err); }
  });

  // 11) listar
  router.get("/api/share/list", (req, res) => {
    const items = [...shares.entries()].map(([id, s]) => ({
      id, key: s.key, expiresSec: s.expiresSec, maxDownloads: s.maxDownloads, downloads: s.downloads, createdAt: s.createdAt
    }));
    res.json({ ok: true, items });
  });

  // 12) revocar
  router.post("/api/share/revoke", (req, res) => {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id requerido" });
    const removed = shares.delete(String(id));
    res.json({ ok: true, removed });
  });

  // ==============================================
  // MOVE / DELETE
  // ==============================================
  // 16) mover/renombrar: { from, to }
  router.post("/api/move", async (req, res, next) => {
    try {
      const { from, to } = req.body || {};
      need(from, "from"); need(to, "to");
      await s3.send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `/${bucket}/${encodeURIComponent(from)}`,
        Key: to
      }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: from }));
      res.json({ ok: true, from, to });
    } catch (err) { next(err); }
  });

  // 17) borrar objeto (query ?key=...)
  router.delete("/api/object", async (req, res, next) => {
    try {
      const key = req.query.key;
      need(key, "key");
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      res.json({ ok: true, key });
    } catch (err) { next(err); }
  });

  // ==============================================
  // TRASH (stubs simples con prefijo "trash/")
  // ==============================================
  // 18) restaurar
  router.post("/api/trash/restore", async (req, res, next) => {
    try {
      let { key } = req.body || {};
      need(key, "key");
      if (!key.startsWith("trash/")) key = `trash/${key}`;
      const to = key.replace(/^trash\//, "");
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `/${bucket}/${encodeURIComponent(key)}`, Key: to }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      res.json({ ok: true, restored: to });
    } catch (err) { next(err); }
  });

  // 19) vaciar papelera — solo stub (200 OK)
  router.post("/api/trash/empty", async (req, res) => {
    res.json({ ok: true, note: "Stub: implementa listado y borrado masivo del prefijo trash/" });
  });

  // 14) stats recalc — stub
  router.post("/api/stats/recalc", (req, res) => res.json({ ok: true }));

  // 20) backup — stub
  router.post("/api/backup/run", (req, res) => res.json({ ok: true }));

  // error handler
  router.use((err, req, res, next) => {
    const code = err.status || 500;
    res.status(code).json({ ok: false, error: err.name || "Error", message: err.message || String(err) });
  });

  return router;
};
