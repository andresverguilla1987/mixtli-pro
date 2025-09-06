import express from 'express';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { hashCode, verifyCode, generateBackupCodes } from '../lib/recovery.js';

const router = express.Router();

router.post('/2fa/setup', async (req, res) => {
  const user = req.user;
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, process.env.TOTP_ISSUER || 'Mixtli', secret);
  const qrDataUrl = await qrcode.toDataURL(otpauth);

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecretEnc: encrypt(secret) } });
  res.json({ otpauth, qrDataUrl });
});

router.post('/2fa/enable', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const secret = user.twoFactorSecretEnc ? decrypt(user.twoFactorSecretEnc) : null;
  if (!secret) return res.status(400).json({ error: 'No hay secreto pendiente' });

  const { code } = req.body || {};
  const ok = authenticator.check(code || '', secret);
  if (!ok) return res.status(400).json({ error: 'Código inválido' });

  const plainCodes = generateBackupCodes(10);
  for (const c of plainCodes) {
    const h = await hashCode(c);
    await prisma.recoveryCode.create({ data: { userId: user.id, hash: h } });
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  res.json({ enabled: true, recoveryCodes: plainCodes });
});

router.post('/2fa/backup/pdf', async (req, res) => {
  const user = req.user;
  const { plainCodes } = req.body || {};
  if (!Array.isArray(plainCodes) || plainCodes.length === 0) {
    return res.status(400).json({ error: 'Falta lista de códigos' });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Mixtli-2FA-Respaldo.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text('Códigos de respaldo – Mixtli', { align: 'center' });
  doc.moveDown().fontSize(12).text(`Usuario: ${user.email}`);
  doc.text(`Fecha: ${new Date().toLocaleString('es-MX')}`);
  doc.moveDown().text('Guarda e imprime esta hoja. Cada código puede usarse una sola vez.');
  doc.moveDown();
  plainCodes.forEach((c, i) => doc.text(`${i + 1}. ${c}`));
  doc.end();
});

router.post('/2fa/backup/use', async (req, res) => {
  const userId = req.user.id;
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Código requerido' });

  const list = await prisma.recoveryCode.findMany({ where: { userId, usedAt: null } });
  let match = null;
  for (const item of list) {
    if (await verifyCode(item.hash, code)) { match = item; break; }
  }
  if (!match) return res.status(400).json({ error: 'Código inválido' });

  await prisma.recoveryCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
  res.json({ ok: true });
});

export default router;
