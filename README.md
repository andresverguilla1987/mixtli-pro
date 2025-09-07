# Mixtli — Autopatch Sentry v8 + Redis (se integran solas)

Este paquete migra tu código **automáticamente** para:
- Pasar de `Sentry.Handlers.*` (v7) a `Sentry v8` con `setupExpressErrorHandler(app)`
- Cambiar inicialización de Redis a **usar `REDIS_URL`** (y dejar de usar `127.0.0.1:6379`)

## Qué trae
- `scripts/migrate-sentry-v8.js`
- `scripts/migrate-redis-url.js`
- `render/render-build-autopatch.sh` (para correr en Render antes del build)
- `apps/api/src/sentry/instrument.ts` (instrumentación temprana de Sentry)

---

## Forma 1 (recomendada): Autopatch en Render (Build Command)
1) Añade este repo al tuyo (copia los archivos de este ZIP).
2) En **Build Command** de Render, **antepone** la ejecución del autopatch antes de tu build.
   Por ejemplo, si tu Build Command actual es:
   ```
   bash -lc "cd apps/api && <tu setup> && npm run build"
   ```
   cámbialo a:
   ```
   bash -lc "bash render/render-build-autopatch.sh && cd apps/api && <tu setup> && npm run build"
   ```
   > *No borres tu setup actual; solo agrega `bash render/render-build-autopatch.sh` al inicio.*

3) En **Start Command** puedes mantener lo que ya tengas. Si usas instrumentación temprana:
   ```
   cd apps/api && npx prisma migrate deploy && node --import ./dist/sentry/instrument.js dist/server.js
   ```
   o con variable de entorno:
   ```
   NODE_OPTIONS=--import ./dist/sentry/instrument.js
   ```

4) Define en Render tus variables:
   - `SENTRY_DSN` (y si quieres `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`).
   - `REDIS_URL` (Internal Connection String de tu Redis/Key-Value en Render).

5) Deploy. El autopatch modificará el **source** antes de compilar.

---

## Forma 2: Autopatch local + commit
1) Copia los archivos de este ZIP al repo.
2) Ejecuta:
   ```bash
   node scripts/migrate-sentry-v8.js apps/api/src/app.ts
   node scripts/migrate-redis-url.js apps/api/src
   ```
3) Revisa los cambios, haz commit y push.
4) Ajusta tu Start Command si quieres instrumentación temprana de Sentry.
5) Deploy.

---

## Notas
- El migrador de Redis reemplaza patrones comunes de `node-redis` e `ioredis` para usar `process.env.REDIS_URL ?? "redis://127.0.0.1:6379"`.
- Si tienes stores de sesión/colas que construyen el cliente de otra forma, repite el migrador; si no los toca, te aviso en logs con `NOOP`.
- El migrador de Sentry también crea `instrument.ts` si no existe.
- Si quieres, puedes quitar el fallback `"redis://127.0.0.1:6379"` y dejar **solo** `process.env.REDIS_URL` (obliga a definir la variable).

