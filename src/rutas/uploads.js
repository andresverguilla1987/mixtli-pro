// src/rutas/uploads.js
// Router con endpoints de: listar objetos, URL firmada GET, y flujo multipart (init, sign-part, complete, abort)
const express = require("express");
const {
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3 } = require("../lib/s3");

const router = express.Router();

const BUCKET = process.env.S3_BUCKET || process.env.AWS_BUCKET || "";

// --- 1) Listar objetos por prefijo
router.get("/list", async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: "Falta S3_BUCKET" });
    const prefix = (req.query.prefix || "uploads/").trim();
    const data = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
      })
    );
    const archivos = (data.Contents || []).map((o) => ({
      key: o.Key,
      size: o.Size,
      lastModified: o.LastModified,
    }));
    res.json({ archivos });
  } catch (err) {
    console.error("Error list:", err);
    res.status(500).json({ error: "No se pudo listar archivos" });
  }
});

// --- 2) URL firmada GET para descargar/stream
router.get("/sign-get", async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: "Falta S3_BUCKET" });
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: "Parámetro 'key' requerido" });
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 60 * 10 } // 10 minutos
    );
    res.json({ url });
  } catch (err) {
    console.error("Error sign-get:", err);
    res.status(500).json({ error: "No se pudo firmar URL" });
  }
});

// --- 3) Multipart INIT (desde el backend, el cliente primero pide esta URL)
router.post("/multipart/init", async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: "Falta S3_BUCKET" });
    const { key, contentType } = req.body || {};
    if (!key) return res.status(400).json({ error: "Falta 'key'" });

    const cmd = new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });
    const out = await s3.send(cmd);
    res.json({ uploadId: out.UploadId, key });
  } catch (err) {
    console.error("multipart/init error:", err);
    res.status(500).json({ error: "No se pudo inicializar multipart" });
  }
});

// --- 4) Multipart SIGN PART (el frontend sube cada parte directo a S3 con la URL firmada)
router.get("/multipart/sign-part", async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: "Falta S3_BUCKET" });
    const { key, uploadId, partNumber } = req.query;
    if (!key || !uploadId || !partNumber)
      return res.status(400).json({ error: "key, uploadId y partNumber son requeridos" });

    // SDK v3 no trae un comando directo para firmar UploadPart, usamos un objeto "fake" con handlerName
    const signerParams = {
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      PartNumber: Number(partNumber),
    };

    // truco: construir petición firmable a mano
    const { HttpRequest } = require("@smithy/protocol-http");
    const { defaultProvider } = require("@aws-sdk/credential-provider-node");
    const { SignatureV4 } = require("@smithy/signature-v4");
    const { Sha256 } = require("@aws-crypto/sha256-js");
    const { REGION } = require("../lib/s3");

    const creds = await defaultProvider()();
    const signer = new SignatureV4({
      credentials: creds,
      region: REGION,
      service: "s3",
      sha256: Sha256,
    });

    const urlPath = `/${encodeURIComponent(BUCKET)}/${encodeURIComponent(key)}?partNumber=${Number(partNumber)}&uploadId=${encodeURIComponent(uploadId)}`;
    const reqToSign = new HttpRequest({
      protocol: "https:",
      hostname: `${BUCKET}.s3.${REGION}.amazonaws.com`,
      method: "PUT",
      path: `/${encodeURIComponent(key)}?partNumber=${Number(partNumber)}&uploadId=${encodeURIComponent(uploadId)}`,
      headers: { host: `${BUCKET}.s3.${REGION}.amazonaws.com` },
    });

    const url = await signer.presign(reqToSign, { expiresIn: 60 * 10 });
    res.json({ url });
  } catch (err) {
    console.error("multipart/sign-part error:", err);
    res.status(500).json({ error: "No se pudo firmar la parte" });
  }
});

// --- 5) Multipart COMPLETE
router.post("/multipart/complete", async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: "Falta S3_BUCKET" });
    const { key, uploadId, parts } = req.body || {};
    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: "key, uploadId y parts[] requeridos" });
    }
    // parts: [{ ETag, PartNumber }]
    const cmd = new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.map(p => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) })) },
    });
    const out = await s3.send(cmd);
    res.json({ location: out.Location, bucket: out.Bucket, key: out.Key, etag: out.ETag });
  } catch (err) {
    console.error("multipart/complete error:", err);
    res.status(500).json({ error: "No se pudo completar el multipart" });
  }
});

// --- 6) Multipart ABORT
router.post("/multipart/abort", async (req, res) => {
  try {
    if (!BUCKET) return res.status(500).json({ error: "Falta S3_BUCKET" });
    const { key, uploadId } = req.body || {};
    if (!key || !uploadId) return res.status(400).json({ error: "key y uploadId requeridos" });
    const cmd = new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
    });
    await s3.send(cmd);
    res.json({ ok: true });
  } catch (err) {
    console.error("multipart/abort error:", err);
    res.status(500).json({ error: "No se pudo abortar el multipart" });
  }
});

module.exports = router;