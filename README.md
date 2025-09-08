# Demo Smoke (Scheduled)

Programa un smoke test alrededor de la demo para tu API ya desplegada (Render u otro).
Ejecuta **tres** corridas diarias a la hora de la demo (MX): **13:50, 14:10, 14:30**.

> **Nota:** GitHub Actions usa **UTC**. CDMX es **UTC-6** todo el año. Por eso el cron corre a 19:50, 20:10 y 20:30 **UTC**.

## Instalar
1. Sube `.github/workflows/demo-smoke-scheduled.yml` a tu repo (rama por defecto).
2. Ve a **Settings → Secrets and variables → Actions** y configura:
   - **Variables**:
     - `DEMO_BASE_URL` → tu URL pública (ej. `https://mixtli-pro.onrender.com`)
   - **Secrets** (opcionales para alertas):
     - `SLACK_WEBHOOK_URL`
     - `DISCORD_WEBHOOK_URL`

## Qué valida
- `GET /salud` debe responder 2xx/3xx
- `GET /` debe responder 2xx/3xx

Si todo pasa, manda ✅ a Slack/Discord (si configuraste webhooks). Si falla, manda ❌ y marca el job en rojo.

## Ejecutarlo a mano
Además de `schedule`, puedes abrir la pestaña **Actions → Demo Smoke (Scheduled - MX 13:50/14:10/14:30)** y usar **Run workflow**.

## Ajustar horarios
Edita los `cron` en el workflow. Recuerda que **son UTC**. Ejemplos comunes (MX → UTC, restando 6h):
- 13:50 MX → `50 19 * * *`
- 14:10 MX → `10 20 * * *`
- 14:30 MX → `30 20 * * *`

## Troubleshooting
- Si el job falla con `DEMO_BASE_URL is not set`, ve a **Settings → Secrets and variables → Actions → Variables** y agrega `DEMO_BASE_URL`.
- Si tus endpoints son otros, cambia `HEALTH_PATH` y `HOME_PATH` en `env:` del workflow.
- Retrasos de minutos son normales en jobs por `schedule` de GitHub.
