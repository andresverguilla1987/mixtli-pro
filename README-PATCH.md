# Mixtli Combo Patch — Security + Alerts

Este paquete mete **dos cosas de un jalón**:
1) **Middlewares de seguridad** (rate‑limit, CORS y Helmet) listos para usar en `apps/api`.
2) **Automations** en GitHub Actions: _Uptime monitor_ y _Sentry error‑rate alert_ con aviso opcional a Slack.

---

## 1) Middlewares de seguridad (apps/api)

**Archivos nuevos**:
- `apps/api/src/middleware/security/rateLimit.ts`
- `apps/api/src/middleware/security/cors.ts`
- `apps/api/src/middleware/security/helmet.ts`
- `apps/api/src/app-security-bootstrap.ts` (helper)

**Cómo integrarlos** en `apps/api/src/app.ts` (antes de las rutas):
```ts
import applySecurity from './app-security-bootstrap';
// ...
applySecurity(app);
```

**Env opcionales**:
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=300`
- `CORS_ORIGIN=https://mixtli.app,https://demo.mixtli.app` (coma‑separado; `*` abre todo)
- `CORS_CREDENTIALS=1` (si necesitas cookies/Authorization con CORS)

**Nota:** si no tienes `helmet` instalado:
```bash
cd apps/api && npm i helmet @types/helmet -D
```

---

## 2) GitHub Actions

**Archivos nuevos**:
- `.github/workflows/uptime-monitor.yml`
- `.github/workflows/sentry-error-rate-alert.yml`
- `scripts/notify-slack.sh`

**Variables/Secrets necesarios** (en tu repo):
- `UPTIME_URL` (Repo → Settings → Variables → `UPTIME_URL`, ej: `https://mixtli-pro.onrender.com/salud`)
- `SENTRY_AUTH_TOKEN` (Secret)
- `SENTRY_ORG` (Secret, slug de tu org)
- `SENTRY_PROJECT` (Secret, slug del proyecto)
- `SLACK_WEBHOOK_URL` (Secret, opcional para alertas)
- `SENTRY_ERROR_THRESHOLD` (Variable, default `20`)

Los cron jobs corren cada 5 minutos. Lanza manualmente con **Run workflow** si quieres probar al instante.

---

## Instalación

1. Extrae este zip en la raíz del repo (manteniendo las rutas).
2. Asegúrate de instalar las dependencias en `apps/api` si falta alguna:
   ```bash
   cd apps/api
   npm i helmet express-rate-limit cors
   npm i -D @types/helmet @types/cors
   ```
3. Commitea y sube:
   ```bash
   git add .
   git commit -m "feat(security+alerts): rate-limit, CORS, helmet + uptime & sentry alert"
   git push
   ```
4. Configura Variables/Secrets como se indica arriba.
5. Verifica en la pestaña **Actions** que ambos workflows quedaron en verde.

---

## Troubleshooting rápido
- **CORS bloquea el front** → agrega el origen a `CORS_ORIGIN` (coma‑separado) y redeploy.
- **Rate limit muy agresivo** → sube `RATE_LIMIT_MAX` o `RATE_LIMIT_WINDOW_MS`.
- **Sentry alert no cuenta nada** → revisa los slugs `SENTRY_ORG`/`SENTRY_PROJECT` y el token. También puedes bajar `SENTRY_ERROR_THRESHOLD` para probar la alerta.
