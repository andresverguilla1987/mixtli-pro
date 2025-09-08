# Pasos para dejarlo fino en Mixtli

1) Copia `apps/api/observability/` y `ops/observability/` del paquete anterior al monorepo.
2) Instala dependencias (ver README del paquete).
3) Opción A (auto): `node bin/apply-observability.mjs` desde la raíz.
4) Opción B (patch manual): aplica el parche correspondiente:
   - TS: `patch -p0 < patches/ts-server.patch`
   - JS: `patch -p0 < patches/js-server.patch`
   Si falla, abre el archivo y pega manualmente los bloques del patch.
5) Levanta el monitoreo: `cd ops/observability/config && docker compose up -d`.
6) Importa el dashboard en Grafana (`grafana/dashboards/mixtli-http.json`).
7) Agrega `prometheus/alerts-extended.yml` a `rule_files` en `ops/observability/config/prometheus/prometheus.yml`.
8) (Render) Define `SERVICE_NAME`, `LOG_LEVEL`, `OTEL_EXPORTER_OTLP_ENDPOINT`.
9) Valida: `bash scripts/validate.sh` con la API corriendo.

Tips:
- Si tu API está en otro puerto, actualiza `prometheus.yml` (target) y `postman_collection.json`.
- Para ver correlación por `X-Request-Id`, revisa logs de la API (pino) o agrega el header en tus pruebas.
