# Uptime Monitor (Render)

Monitorea tu API de Mixtli en Render cada 5 minutos. Pinga `/` y `/salud`, falla si no hay 2xx o si la latencia supera un umbral.

## Instalación
1. Copia el workflow a `.github/workflows/uptime-monitor.yml` en tu repo.
2. (Opcional) En **Settings → Secrets and variables → Actions**, añade:
   - `SLACK_WEBHOOK_URL` para alertas.

## Uso
- Se ejecuta solo (cron) o manual en **Actions** con inputs opcionales:
  - `target_url` (default `https://mixtli-pro.onrender.com`)
  - `salud_path` (default `/salud`)
  - `timeout_ms` (default `1500`)

## Qué hace al fallar
- Crea un Issue etiquetado `uptime, incident` con detalle.
- Envia alerta a Slack si configuraste `SLACK_WEBHOOK_URL`.
- Cuando vuelve a verde, cierra los issues abiertos automáticamente.
