# Mixtli Observability Suite — ONE ZIP

Este paquete reúne **todos** los packs en una sola descarga y organizados por carpetas:

- `core/` — Observability base (request-id, Pino, /metrics, OTel, Sentry) + stack Docker (Prom/Grafana/Loki/Promtail/Alertmanager/OTel).
- `integration/` — Integración directa al monorepo (`apps/api`) en **JS/TS** + `bin/apply-observability.mjs`.
- `fino/` — Dashboard Grafana, alertas extendidas, Postman y script `scripts/validate.sh` + parches TS/JS.
- `render/` — `render.yaml` listo con healthcheck `/salud`, Prisma deploy y arranque.
- `slo-runbooks/` — Recording rules + alertas SLO multiwindow (99.9%) + **RUNBOOKS**.
- `logs/` — Promtail pipeline para **Pino JSON** (labels: requestId, level, route, status) y scrape de **Docker**.

## Quickstart (5 pasos)
1. **Integración** (integration/):
   ```bash
   node bin/apply-observability.mjs
   ```
   (o aplica el parche de `fino/patches/*`).
2. **Monitoreo local** (core/):
   ```bash
   cd ops/observability/config
   docker compose up -d
   ```
3. **Dashboard** (fino/):
   Importa `grafana/dashboards/mixtli-http.json` en Grafana.
4. **Alertas extra + SLO** (fino/ + slo-runbooks/):
   Agrega a `rule_files` de Prometheus:
   ```yaml
   - /etc/prometheus/alerts.yml
   - /etc/prometheus/alerts-extended.yml
   - /etc/prometheus/alerts-slo.yml
   - /etc/prometheus/recording_rules.yml
   ```
5. **Render** (render/):
   Copia `render.yaml` a la raíz del repo y despliega como **Blueprint**.

## Vars mínimas de la API
```
SERVICE_NAME=mixtli-api
NODE_ENV=production
LOG_LEVEL=info
SENTRY_DSN=           # opcional
OTEL_EXPORTER_OTLP_ENDPOINT=http://<collector>:4318
PORT=10000
```

## Smoke test
```bash
curl -i http://localhost:10000/salud
curl -s http://localhost:10000/metrics | head
```

> Tip: Si corres la API en otro puerto/host, actualiza el target en `core/ops/observability/config/prometheus/prometheus.yml` y las colecciones/postman.
