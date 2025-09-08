# Mixtli Alerts Kit

Este paquete agrega **monitoreo de uptime y latencia** con alertas opcionales a Slack.

## Contenido
- `alerts/check.mjs`: script Node sin dependencias que:
  - Pega a uno o varios endpoints (`GET`) y mide latencia.
  - Opcional: valida que `/metrics` responda.
  - Si hay fallo o latencia > umbral, manda alerta a Slack (si configuras el webhook).
- `.github/workflows/uptime.yml`: corre el script cada 5 min en GitHub Actions.

## Configuración
1. Sube estos archivos al repo (raíz).
2. En **GitHub → Settings → Secrets and variables → Actions → New repository secret** crea:
   - `BASE_URL`: p. ej. `https://mixtli-pro.onrender.com`
   - `SLACK_WEBHOOK_URL` (opcional): Webhook entrante de Slack.
   - `ENDPOINTS` (opcional): p. ej. `"/,/salud,/api/users"`
   - `TIMEOUT_MS` (opcional): p. ej. `7000`
   - `MAX_LATENCY_MS` (opcional): p. ej. `2000`
3. El workflow **Uptime checks** ya queda activo (cada 5 min). También puedes correrlo manual con *Run workflow*.

## Ejecución local (opcional)
```bash
BASE_URL=https://mixtli-pro.onrender.com node alerts/check.mjs
```

## Salida de ejemplo
```
✅ Uptime OK @ 2025-09-08T00:00:00.000Z
Base: https://mixtli-pro.onrender.com
• /salud → 200 in 12 ms ✅
• metrics /metrics → 200 ✅
```
