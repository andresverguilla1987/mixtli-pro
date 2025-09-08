/**
 * Health + readiness endpoints for Mixtli API
 * - GET /salud   -> quick 200 OK text
 * - GET /live    -> liveness (always OK if process is up)
 * - GET /ready   -> readiness (checks DB via Prisma)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/salud', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: 'api', ts: new Date().toISOString() });
});

router.get('/live', (_req: Request, res: Response) => {
  // If the process is running and able to handle a handler, return 200
  res.status(200).json({ status: 'live' });
});

router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Minimal Prisma round-trip (no-op query)
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready' });
  } catch (err: any) {
    res.status(503).json({ status: 'not_ready', error: err?.message || 'db_error' });
  }
});

export default router;
