// apps/api/src/refresh.ts
import express from 'express';
const router = express.Router();

router.post('/refresh', async (req, res) => {
  const secret = (process.env.DEMO_CRON_SECRET || '').trim();
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!secret || auth !== secret) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    // TODO: Implementa aquí tu lógica real de refresh para la demo.
    // Ejemplos (descomenta/ajusta lo que necesites):
    // await seedDemoData();
    // await reindexEmbeddings();
    // await clearCaches();

    return res.json({ ok: true, ranAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('[refresh] error', err);
    return res.status(500).json({ ok: false, error: err?.message || 'refresh_failed' });
  }
});

export default router;
