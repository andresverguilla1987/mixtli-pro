# Mixtli Combo Patch (Security + Uptime + Sentry Guard)

## Qué incluye
- `apps/api/src/app-security-bootstrap.ts`: Helmet + CORS + Rate Limit listo para usar.
- `.github/workflows/uptime-monitor.yml`: Pingea `/salud` (o el endpoint que definas en `UPTIME_URL`) cada 5 min.
- `.github/workflows/sentry-error-rate.yml` + `scripts/check-sentry-error-rate.mjs`: Revisa errores de Sentry en los últimos 15 min y alerta si superan el umbral.

## Cómo usar
1. **Copiar archivos** (o descomprimir el ZIP) en la raíz del repo.
2. **Montar seguridad** en tu `app.ts`:
   ```ts
   import applySecurity from './app-security-bootstrap';
   applySecurity(app);
   ```
3. **GitHub → Settings → Secrets and variables → Actions**  
   - Variables: `UPTIME_URL` (ej. `https://mixtli-pro.onrender.com/salud`), `SENTRY_ERROR_THRESHOLD` (opcional).
   - Secrets: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SLACK_WEBHOOK_URL` (opcional).
4. **Actions → Run workflow** para probar ambos jobs.

> Nota: el checker de Sentry usa `events-stats` agrupado cada 5 minutos sobre `event.type:error` en los últimos 15 minutos. Si el API de Sentry cambia, ajusta el script.
