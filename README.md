# Mixtli CI – Slack

Este paquete agrega el workflow de GitHub Actions con:
- Tests de Postman/Newman
- Deploy a Render
- Healthcheck a `/salud`
- Notificación a Slack (éxito y falla)

## Instalación
1. Descomprime en la raíz del repo. Debe crear `.github/workflows/ci.yml`.
2. Crea los *Secrets*:
   - `DATABASE_URL` (obligatorio para los tests/backend)
   - `RENDER_API_KEY` (si usas deploy a Render)
   - `RENDER_SERVICE_ID` (si usas deploy a Render)
   - `SLACK_WEBHOOK_URL` (para notificar)

¡Listo!
