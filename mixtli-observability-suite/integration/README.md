# Mixtli Observability Integration (apps/api)

Paquete listo para **apps/api** (Express/Node). Agrega: **request-id**, **logs Pino**, **/metrics Prometheus**, **tracing OpenTelemetry**, **Sentry**, y **stack de monitoreo** (Prometheus, Grafana, Loki, Promtail, Alertmanager, OTel Collector).

## Rápido (JS)
1) Copia `apps/api/observability/` y `ops/observability/` a tu monorepo.
2) En `apps/api/server.js` o `apps/api/dist/server.js` (según tu entrada), agrega arriba:
```js
require('./observability/node/tracing').start();
```
3) En el archivo donde creas el `app = express()`:
```js
const requestId = require('./observability/node/middleware/requestId');
const logger = require('./observability/node/middleware/logger');
const { metricsRouter, instrument, httpRequestDuration } = require('./observability/node/metrics');
const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('./observability/node/sentry');

initSentry();
app.use(requestId());
app.use(logger());
instrument(app);

// opcional: health
app.get('/salud', (req, res) => {
  const end = httpRequestDuration.startTimer({ route: '/salud', method: 'GET' });
  res.json({ ok: true, requestId: req.requestId, ts: new Date().toISOString() });
  end({ status_code: 200 });
});

app.use('/metrics', metricsRouter);

// Sentry al final
app.use(sentryRequestHandler());
app.use(sentryErrorHandler());
```
4) Variables:
```
SERVICE_NAME=mixtli-api
NODE_ENV=production
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
LOG_LEVEL=info
```
5) Monitoreo local:
```bash
cd ops/observability/config
docker compose up -d
```
Grafana: http://localhost:3000 (admin/admin)

## Rápido (TS)
- Usa los archivos espejo en `apps/api/observability/ts/*` y ajusta imports:
```ts
import { start as startOtel } from './observability/ts/tracing';
startOtel();

import requestId from './observability/ts/middleware/requestId';
import logger from './observability/ts/middleware/logger';
import { metricsRouter, instrument, httpRequestDuration } from './observability/ts/metrics';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './observability/ts/sentry';
```
- Asegúrate de tener tipos: `npm i -D @types/express @types/pino pino-http`.

## Script auto-inserción (experimental)
Puedes probar:
```bash
node bin/apply-observability.mjs
```
- Busca `apps/api/src/server.ts` o `apps/api/server.js`, inyecta imports y middlewares. Hace backup `.bak`.

## Render/Producción
- Mantén el stack de monitoreo en una VM propia o en tu laptop con túnel para desarrollo.
- Expón `/metrics` si Prometheus lo va a scrapear (o usa un Sidecar).

