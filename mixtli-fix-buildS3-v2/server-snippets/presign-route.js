// server-snippets/presign-route.js - ESM
import express from "express";
import { presignUpload, presignGet, listAll } from "../utils/s3.js";

export const healthRouter = express.Router();
healthRouter.get("/salud", (_req, res) => res.send("ok"));

export const presignRouter = express.Router();
presignRouter.post("/api/presign", async (req, res) => {
  try {
    const b = req.body || {};
    const key = b.key || b.filename || b.name;
    const contentType = b.contentType || b.type || b.mimetype;
    const expiresIn = Number(b.expiresIn) || 3600;

    if (!key || !contentType) {
      return res.status(400).json({ error: "key y contentType son requeridos" });
    }

    const url = await presignUpload({ key, contentType, expiresIn });
    return res.json({ url, key, contentType, expiresIn });
  } catch (err) {
    console.error("[/api/presign] error:", err);
    return res.status(500).json({ error: "presign failed" });
  }
});

export const filesRouter = express.Router();

// Redirección a URL firmada para GET de objetos
filesRouter.get("/files/:key", async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const url = await presignGet({ key });
    return res.redirect(302, url);
  } catch (err) {
    console.error("[/files/:key] error:", err);
    return res.status(404).json({ error: "not found" });
  }
});

// Listado simple
filesRouter.get("/api/list", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 160;
    const prefix = typeof req.query.prefix === "string" ? req.query.prefix : "";
    const items = await listAll({ prefix, maxKeys: limit });
    res.set("Cache-Control", "private, max-age=10");
    return res.json({ items });
  } catch (err) {
    console.error("[/api/list] error:", err);
    return res.status(500).json({ error: "list failed" });
  }
});
