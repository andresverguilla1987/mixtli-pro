// server-snippets/presign-route.js
import express from "express";
import multer from "multer";
import { presignUpload } from "../utils/s3.js";

const uploadNone = multer().none();
const router = express.Router();

// local body parsers for safety (in case app doesn't mount them globally)
router.use(express.json({ limit: "2mb" }));
router.use(express.urlencoded({ extended: true }));

// CORS preflight (OPTIONAL: if your global CORS already handles this, you can remove it)
router.options("/api/presign", (_, res) => res.sendStatus(204));

router.post("/api/presign", uploadNone, async (req, res) => {
  try {
    // Support JSON, urlencoded, and multipart(FormData) field names
    const body = req.body || {};
    const key = body.key || body.filename || body.name;
    const contentType = body.contentType || body.type || body.mimetype || "application/octet-stream";
    const expiresSeconds = body.expires || body.expiresIn || 900;

    if (!key) {
      return res.status(400).json({ error: "missing key (or filename/name)" });
    }

    const result = await presignUpload({ key, contentType, expiresSeconds: Number(expiresSeconds) || 900 });
    return res.json({ ok: true, ...result });
  } catch (err) {
    const status = 500;
    return res.status(status).json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;
