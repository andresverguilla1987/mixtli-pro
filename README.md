# Mixtli CI – Slack + Metrics

Este paquete actualiza el workflow para:
- Ejecutar Postman/Newman y **guardar reportes HTML y JSON**
- **Subir artifacts** con los reportes
- Hacer **deploy a Render** si todo pasa
- **Healthcheck** a `/salud`
- Enviar **notificación a Slack** con métricas: *tests totales, pasados, fallados* y *duración*

## Instalar
1. Sube los archivos a la raíz del repo, respetando rutas:
   - `.github/workflows/ci.yml`
   - `guiones/run-tests.sh`
2. Asegúrate de tener estos *Secrets* en GitHub (Settings → Secrets → Actions):
   - `DATABASE_URL`
   - `RENDER_API_KEY`
   - `RENDER_SERVICE_ID`
   - `SLACK_WEBHOOK_URL`
3. Haz un push a `main` o ejecuta **Actions → Run workflow**.

Listo. Verás el reporte en *Artifacts* y un mensaje con métricas en Slack.
