// @ts-nocheck
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { demoUsers } from './demo-data.js';

const router = express.Router();
const prisma = new PrismaClient();

function requireDemo(req, res, next) {
  if (process.env.DEMO_ENABLED !== 'true') {
    return res.status(403).json({ ok:false, error: 'Demo disabled' });
  }
  const pin = req.header('x-demo-pin') || req.query.pin || req.body?.pin;
  if (!process.env.DEMO_PIN || pin !== process.env.DEMO_PIN) {
    return res.status(401).json({ ok:false, error: 'Invalid or missing demo PIN' });
  }
  next();
}

router.get('/status', (_req, res) => {
  res.json({ ok:true, demo: process.env.DEMO_ENABLED === 'true', hasPin: !!process.env.DEMO_PIN });
});

router.post('/seed', requireDemo, async (_req, res) => {
  try {
    // Intenta usar prisma.user si existe
    if (!prisma.user) {
      return res.status(501).json({
        ok:false,
        error:"Tu modelo Prisma no se llama 'User'. Cambia 'prisma.user' por tu modelo real (p.ej. prisma.usuario)."
      });
    }

    // createMany con skipDuplicates si hay unique en email
    try {
      await prisma.user.createMany({
        data: demoUsers.map(u => ({
          email: u.email, name: u.name
        })),
        skipDuplicates: true
      });
    } catch (e) {
      // fallback a upsert por si no está unique en email
      for (const u of demoUsers) {
        try {
          await prisma.user.upsert({
            where: { email: u.email },
            update: { name: u.name },
            create: { email: u.email, name: u.name }
          });
        } catch {
          // si no hay unique en email, crea sin upsert
          await prisma.user.create({ data: { email: u.email, name: u.name } });
        }
      }
    }

    res.json({ ok:true, inserted: demoUsers.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error: String(err?.message || err) });
  }
});

router.post('/reset', requireDemo, async (_req, res) => {
  try {
    if (!prisma.user) {
      return res.status(501).json({
        ok:false,
        error:"Tu modelo Prisma no se llama 'User'. Cambia 'prisma.user' por tu modelo real."
      });
    }
    // Elimina solo los usuarios demo (por dominio/email patrón)
    const emails = demoUsers.map(u => u.email);
    // Si tu Prisma soporta deleteMany con in[]
    await prisma.user.deleteMany({
      where: { email: { in: emails } }
    });
    res.json({ ok:true, deleted: emails.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error: String(err?.message || err) });
  }
});

export default router;
