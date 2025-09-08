# Observability & Traceability Pack (Node.js + Docker Compose)

Este paquete agrega **trazabilidad (OpenTelemetry + request-id)**, **métricas Prometheus**, **logs estructurados (Pino + Loki)**, **Sentry**, y **alertas básicas** usando **Prometheus + Alertmanager + Grafana**. Incluye ejemplos para Express.

## Contenido
- `node/`:
  - `middleware/requestId.js`: Inyecta y propaga `request-id` (header `X-Request-Id`) y agrega al `res.locals`.
  - `middleware/logger.js`: `pino-http` con correlación por `request-id`.
  - `metrics.js`: endpoint `/metrics` con `prom-client` y ejemplos de contadores/histogramas.
  - `sentry.js`: inicialización de Sentry (opcional) con DSN por env var.
  - `tracing.js`: configuración OpenTelemetry SDK con auto-instrumentación y exportación OTLP HTTP.
  - `example/express-server.js`: servidor Express mínimo ya integrado.
- `config/`:
  - `docker-compose.yml`: Prometheus, Grafana, Loki, Promtail, Alertmanager, y OTel Collector.
  - `prometheus/prometheus.yml` y `prometheus/alerts.yml`: scrape + reglas de alerta.
  - `grafana/provisioning/datasources/datasource.yml`: datasources para Prometheus y Loki.
  - `alertmanager/alertmanager.yml`: rutas y receptores (placeholder email/webhook).
  - `otel-collector/otel-collector.yaml`: recibe OTLP y reenvía a Loki/Prometheus si aplica.
  - `loki/loki-config.yaml` y `promtail/promtail-config.yaml`: stack de logs.

## Variables de entorno (ejemplo `.env`)
```
SERVICE_NAME=mixtli-api
NODE_ENV=production
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
LOG_LEVEL=info
METRICS_PORT=9100
```

## Cómo integrarlo en tu app existente (Express)
1) Instala dependencias en **tu proyecto**:
```bash
npm i express pino pino-http prom-client uuid @sentry/node   @opentelemetry/api @opentelemetry/sdk-node   @opentelemetry/auto-instrumentations-node   @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources
```

2) Carga el tracer **lo más arriba posible** (antes de importar tu server):
```js
// index.js (o server.js) - al inicio
require('./node/tracing').start();
```

3) En tu servidor Express:
```js
const express = require('express');
const requestId = require('./node/middleware/requestId');
const logger = require('./node/middleware/logger');
const { metricsRouter, httpRequestDuration } = require('./node/metrics');
const { initSentry, sentryRequestHandler, sentryErrorHandler } = require('./node/sentry');

initSentry();

const app = express();
app.use(requestId());
app.use(logger());

// Ejemplo de métrica de duración
app.get('/salud', async (req, res) => {
  const end = httpRequestDuration.startTimer({ route: '/salud', method: 'GET' });
  res.json({ ok: true, ts: new Date().toISOString() });
  end({ status_code: 200 });
});

// Endpoint de métricas Prometheus
app.use('/metrics', metricsRouter);

// Sentry (al final)
app.use(sentryRequestHandler());
app.use(sentryErrorHandler());

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`API en puerto ${port}`));
```

4) Levanta el stack de monitoreo:
```bash
cd config
docker compose up -d
```

- Grafana: http://localhost:3000 (admin / admin)
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Loki: http://localhost:3100
- OTel Collector (OTLP HTTP): http://localhost:4318

5) Exportación de trazas desde Node: usa `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`.

6) Logs: `pino` escribe a stdout; `promtail` recoge `/var/log/*` y contenedores. Para app fuera de Docker, ajusta `promtail-config.yaml` o corre tu app como servicio Docker para scrape automático.

## Alertas incluidas
- **APIHighErrorRate**: error rate ≥ 5% en 5m.
- **HighLatency95p**: p95 de latencia > 500ms en 10m.
- **InstanceDown**: target caído.

Configura emails/webhooks en `alertmanager.yml` (buscar `REPLACE_ME`).

---

> **Tip**: si usas Render/Netlify/etc., puedes mantener el stack de monitoreo en un servidor aparte (EC2, droplet) o en tu laptop para desarrollo.
