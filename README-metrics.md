# Mixtli Metrics Pack

Esto agrega:
- `/metrics` en formato Prometheus (con `prom-client`)
- Histograma de latencias HTTP (`http_request_duration_seconds`)
- Endpoints `/healthz` y `/readyz`
- Scripts para instalar dependencias e inyectar en `apps/api/src/app.ts`

## Instalación rápida
```bash
unzip mixtli-metrics-pack.zip -d .
bash scripts/install-metrics-deps.sh
bash scripts/inject-metrics.sh
```

Tu build/start actuales siguen funcionando.

## Variables de entorno (opcionales)
- `METRICS_ENABLED` = `true` (default) o `false`
- `METRICS_PATH` = `/metrics`
- `METRICS_TOKEN` = si la pones, exige `Authorization: Bearer <token>`
- `HEALTH_PATH` = `/healthz`
- `READY_PATH`  = `/readyz`
- `METRICS_BUCKETS` = lista de buckets, ej: `0.05,0.1,0.3,0.5,1,2.5,5`

## Verificación local / Render
- `GET /metrics` → debe regresar métricas de proceso y `http_request_duration_seconds`
- `GET /healthz` y `/readyz` → `200 ok`

> Si usas token: añade header `Authorization: Bearer $METRICS_TOKEN`.
