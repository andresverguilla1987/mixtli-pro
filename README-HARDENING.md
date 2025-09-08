# Mixtli Hardening Pack

Incluye:
- **logging estructurado** (pino) con `x-request-id`
- **seguridad** (helmet, CORS configurable por `CORS_ORIGIN`)
- **rate limit** (`express-rate-limit`) para `/api` y `/auth`
- **manejo de errores** y `404` consistentes
- **apagado limpio** (SIGTERM/SIGINT)
- **validación de env** (zod)

## Instalación rápida

```bash
unzip mixtli-hardening-pack.zip -d .
bash scripts/install-hardening-deps.sh
bash scripts/inject-hardening.sh
# Build y deploy como ya lo tienes
```

## Variables útiles
- `LOG_LEVEL=info|debug|warn`
- `CORS_ORIGIN=https://mixtli.app,https://admin.mixtli.app`
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=300`

## Notas
- Si tu `app.ts` difiere mucho del estándar, revisa los cambios que el script hizo (commitea el diff).
- El logger ignora `/salud`, `/live`, `/ready` para no ensuciar logs.
