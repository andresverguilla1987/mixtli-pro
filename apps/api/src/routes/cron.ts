// apps/api/src/routes/cron.ts
import { Router } from 'express';
import { refreshDemo } from '../demo/refresh';

// Monta rutas internas protegidas con un header "x-cron-key"
export function mountCron(app: any) {
  const router = Router();

  router.post('/refresh-demo', async (req: any, res: any) => {
    const headerKey = req.get('x-cron-key');
    const cronKey = process.env.CRON_KEY;

    if (!cronKey || headerKey !== cronKey) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    try {
      const result = await refreshDemo();
      return res.json({ ok: true, result });
    } catch (err: any) {
      console.error('[CRON] refresh-demo failed:', err?.message || err);
      return res.status(500).json({ ok: false, error: 'refresh-failed' });
    }
  });

  app.use('/internal/cron', router);
}

export default mountCron;
