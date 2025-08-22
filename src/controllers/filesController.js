const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { presignPut, presignGet } = require('../utils/s3');

const BUCKET = process.env.S3_BUCKET;
const MAX_MB = parseInt(process.env.MAX_FILE_MB || '2000', 10); // por defecto 2GB
const UP_EXPIRE_MIN = parseInt(process.env.LINK_TTL_MIN || '15', 10);

function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }

exports.createPresignedUpload = async (req, res) => {
  try {
    const { filename, contentType, size } = req.body || {};
    if (!filename || !contentType || !size) {
      return res.status(400).json({ error: 'filename, contentType y size requeridos' });
    }
    if (size > MAX_MB * 1024 * 1024) {
      return res.status(413).json({ error: `Archivo excede el máximo de ${MAX_MB} MB` });
    }
    const expiresInSec = clamp(UP_EXPIRE_MIN * 60, 60, 7*24*3600); // 1 min a 7 días
    const key = `${req.user.id}/${Date.now()}_${filename}`;

    const url = await presignPut({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      expiresInSec
    });

    // Guardar metadata (registro previo a carga)
    const file = await prisma.file.create({
      data: {
        key, filename, size: Number(size), contentType, ownerId: req.user.id
      }
    });

    res.json({ url, key, expiresIn: expiresInSec, fileId: file.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo generar URL de subida', detail: String(e) });
  }
};

exports.createDownloadLink = async (req, res) => {
  try {
    const { key } = req.params;
    // Verifica que exista y que pertenezca al usuario (o que sea admin)
    const file = await prisma.file.findUnique({ where: { key } });
    if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });
    if (req.user.role !== 'ADMIN' && file.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado para descargar' });
    }
    const expiresInSec = clamp(UP_EXPIRE_MIN * 60, 60, 7*24*3600);
    const url = await presignGet({ Bucket: BUCKET, Key: key, expiresInSec });
    res.json({ url, expiresIn: expiresInSec, filename: file.filename, contentType: file.contentType, size: file.size });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo generar URL de descarga', detail: String(e) });
  }
};

exports.listMyFiles = async (req, res) => {
  try {
    const files = await prisma.file.findMany({
      where: req.user.role === 'ADMIN' ? {} : { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id:true, key:true, filename:true, size:true, contentType:true, createdAt:true, ownerId:true }
    });
    res.json(files);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo listar archivos' });
  }
};
