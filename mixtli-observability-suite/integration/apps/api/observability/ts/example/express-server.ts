import express from 'express';
import { start as startOtel } from '../tracing';
import requestId from '../middleware/requestId';
import logger from '../middleware/logger';
import { metricsRouter, instrument, httpRequestDuration } from '../metrics';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from '../sentry';

startOtel();
initSentry();

const app = express();
app.use(requestId());
app.use(logger());
instrument(app);

app.get('/salud', (req: any, res: any) => {
  const end = (httpRequestDuration as any).startTimer({ route: '/salud', method: 'GET' });
  res.json({ ok: true, ts: new Date().toISOString() });
  end({ status_code: 200 });
});

app.use('/metrics', metricsRouter);
app.use(sentryRequestHandler());
app.use(sentryErrorHandler());

app.listen(process.env.PORT || 10000);
