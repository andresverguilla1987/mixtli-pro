# Demo Refresh @ 14:00 MX (GitHub Actions)

Este workflow pega a tu endpoint de refresh todos los días a las **14:00** hora de **Ciudad de México** (GitHub Actions corre en UTC, por eso el cron es `0 20 * * *`).

## Variables/Secrets requeridos
- **Repository Variable** `DEMO_REFRESH_URL` — p.ej. `https://mixtli-pro.onrender.com/api/demo/refresh`
- **Repository Secret** `DEMO_REFRESH_TOKEN` — opcional, si el endpoint requiere `Authorization: Bearer`

## Dónde configurarlo
En GitHub: **Settings → Secrets and variables → Actions**  
- En **Variables** crea `DEMO_REFRESH_URL`  
- En **Secrets** crea `DEMO_REFRESH_TOKEN` (si aplica)

## Ejecutarlo manualmente
Ve a **Actions → Demo Refresh (14:00 MX)** y presiona **Run workflow**.
