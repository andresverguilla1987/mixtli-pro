const express = require('express');
const router = express.Router();

const requiredEnv = ['S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'];
const hasS3 = requiredEnv.every(k => process.env[k]);

// Endpoints visibles (no 404). Si no hay S3 configurado, avisa 501.
router.post('/multipart/init', (req, res) => {
  if (!hasS3) return res.status(501).json({ error: 'S3 no configurado. Define S3_BUCKET,S3_ACCESS_KEY,S3_SECRET_KEY' });
  return res.status(501).json({ error: 'Implementación S3 no habilitada en hotfix. Usa el repo multiservicio.' });
});

router.get('/multipart/sign-part', (req, res) => {
  if (!hasS3) return res.status(501).json({ error: 'S3 no configurado. Define S3_BUCKET,S3_ACCESS_KEY,S3_SECRET_KEY' });
  return res.status(501).json({ error: 'Implementación S3 no habilitada en hotfix. Usa el repo multiservicio.' });
});

router.post('/multipart/complete', (req, res) => {
  if (!hasS3) return res.status(501).json({ error: 'S3 no configurado. Define S3_BUCKET,S3_ACCESS_KEY,S3_SECRET_KEY' });
  return res.status(501).json({ error: 'Implementación S3 no habilitada en hotfix. Usa el repo multiservicio.' });
});

router.post('/multipart/abort', (req, res) => {
  if (!hasS3) return res.status(501).json({ error: 'S3 no configurado. Define S3_BUCKET,S3_ACCESS_KEY,S3_SECRET_KEY' });
  return res.status(501).json({ error: 'Implementación S3 no habilitada en hotfix. Usa el repo multiservicio.' });
});

module.exports = router;
