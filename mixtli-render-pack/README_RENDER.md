# Render Pack — Mixtli API

Este paquete te deja listo el deploy en **Render** con healthcheck `/salud` y variables para el pack de observabilidad.

## Archivos
- `render.yaml`: define el servicio web `mixtli-api` (Node), base de datos `mixtli-db`, healthcheck `/salud`, y comandos de build/start alineados con tu monorepo `apps/api`.
- `.env.render.example`: plantilla de variables (copiar a Render → Environment).

## Pasos
1) Copia `render.yaml` a la **raíz del repo**.
2) Conecta tu repo en Render → **New +** → **Blueprint** y selecciona `render.yaml`.
3) En el servicio `mixtli-api` ajusta/crea las variables:
   - `SENTRY_DSN` (secret)
   - `OTEL_EXPORTER_OTLP_ENDPOINT` → tu collector (o elimínala si no lo usarás).
   - `PORT=10000` (debe coincidir con tu app).
4) Render creará `mixtli-db` y cableará `DATABASE_URL` automáticamente.
5) Verifica que `/salud` responde 200 y que `/metrics` expone métricas Prometheus.

> Si no usas TypeScript o build, cambia los comandos a `node server.js` según tu caso.

## Troubleshooting
- **Prisma**: Si faltan migraciones, confirma `prisma/migrations` y el `schema.prisma`. El `preDeployCommand` ejecuta `prisma migrate deploy`.
- **Puerto**: Render inyecta `PORT`. Asegúrate de que tu app lo respete (por defecto dejamos 10000).
- **OTEL**: Si no tienes collector, quita `OTEL_EXPORTER_OTLP_ENDPOINT` o apunta a uno público/propio.
