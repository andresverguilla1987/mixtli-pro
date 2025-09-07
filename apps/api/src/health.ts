import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

// Root OK for Render health probe
router.get('/', (_req: Request, res: Response) => res.status(200).send('ok'));
router.head('/', (_req: Request, res: Response) => res.status(200).end());

// Explicit health endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
