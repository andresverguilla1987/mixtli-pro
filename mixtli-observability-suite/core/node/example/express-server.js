require('../tracing').start();

const express = require('express');
const requestId = require('../middleware/requestId');
const logger = require('../middleware/logger');
const { metricsRouter, instrument, httpRequestDuration } = require('../metrics');
const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('../sentry');

initSentry();

const app = express();
app.use(requestId());
app.use(logger());
instrument(app);

app.get('/salud', async (req, res) => {
  const end = httpRequestDuration.startTimer({ route: '/salud', method: 'GET' });
  res.json({ ok: true, requestId: req.requestId, ts: new Date().toISOString() });
  end({ status_code: 200 });
});

app.use('/metrics', metricsRouter);

app.use(sentryRequestHandler());
app.use(sentryErrorHandler());

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Ejemplo API en puerto ${port}`));
