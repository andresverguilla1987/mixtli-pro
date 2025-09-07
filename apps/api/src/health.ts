import { Router } from 'express';

const router = Router();

// Health & root OK responses so the platform doesn't mark the service as down.
router.get('/', (_req, res) => res.status(200).send('ok'));
router.head('/', (_req, res) => res.sendStatus(200));
router.get(['/health', '/salud', '/status', '/ready', '/live'], (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
