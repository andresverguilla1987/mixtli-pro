// Optional: /salud that checks DB connectivity with Prisma
import type { Application } from 'express';
import { PrismaClient } from '@prisma/client';

export function registerHealthRoute(app: Application) {
  const prisma = new PrismaClient();
  app.get('/salud', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: true });
    } catch (e) {
      res.status(500).json({ ok: false, db: false });
    }
  });
}
