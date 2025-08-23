import { PrismaClient } from "@prisma/client";
import { presignUpload, presignDownload } from "../utils/s3.js";
const prisma = new PrismaClient();

export async function createPresign(req, res) {
  try {
    const { filename, contentType, size } = req.body;
    if (!filename || !contentType || !size) {
      return res.status(400).json({ error: "filename, contentType y size requeridos" });
    }
    const maxBytes = (process.env.MAX_FILE_MB || 2000) * 1024 * 1024;
    if (size > maxBytes) {
      return res.status(413).json({ error: "Archivo demasiado grande" });
    }

    const key = `${Date.now()}_${filename}`;
    const url = await presignUpload({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType
    });

    await prisma.file.create({ data: { key, filename, size: Number(size), contentType } });
    res.json({ url, key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo generar URL de subida", detalle: String(e) });
  }
}

export async function downloadLink(req, res) {
  try {
    const { key } = req.params;
    const file = await prisma.file.findUnique({ where: { key } });
    if (!file) return res.status(404).json({ error: "Archivo no encontrado" });

    const url = await presignDownload({ Bucket: process.env.S3_BUCKET, Key: key });
    res.json({ url, filename: file.filename });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo generar URL de descarga", detalle: String(e) });
  }
}

export async function listFiles(req, res) {
  try {
    const files = await prisma.file.findMany({ orderBy: { createdAt: "desc" } });
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: "No se pudo listar archivos", detalle: String(e) });
  }
}
