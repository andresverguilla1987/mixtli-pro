# Mixtli API — Health Pack

Este paquete agrega endpoints de salud, liveness y readiness con verificación real a la DB (Prisma).

## Endpoints
- `GET /salud` → 200 con `{ ok: true, service: 'api', ts: ISO }`
- `GET /live`  → 200 si el proceso está vivo.
- `GET /ready` → 200 si la API puede hablar con la base (usa `SELECT 1` con Prisma). 503 si no.

## Instalación (2 pasos)

1) **Descomprime** el ZIP en la **raíz** del repo (debe quedar el archivo `apps/api/src/health.ts` y los scripts en `scripts/`).

2) Ejecuta los scripts:
```bash
bash scripts/install-health-deps.sh
bash scripts/inject-health.sh
```

> El inyector es idempotente: si ya agregó los imports o el `app.use(healthRouter)`, no los duplica.

## Verificación local
Compila tu API y luego prueba:
```bash
curl -i http://localhost:10000/salud
curl -i http://localhost:10000/live
curl -i http://localhost:10000/ready
```

## Render
No necesitas variables nuevas. Solo asegúrate de que tu servicio pueda acceder a la DB.
