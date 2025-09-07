# Fix directo para `apps/api/src/app.ts` (Sentry v8)

Este paquete te deja un `app.ts` ya migrado a Sentry v8+ y un `instrument.ts` opcional.

## Pasos
1) **Copia** `apps/api/src/app.ts` de este ZIP sobre tu repo (reemplaza el actual).
2) (Opcional) Copia `apps/api/src/sentry/instrument.ts` si quieres instrumentación temprana.
3) **Borra cualquier resto** de API vieja en tu fuente (por si quedaron en otros archivos):
   - `Sentry.Handlers.requestHandler(...)`
   - `Sentry.Handlers.tracingHandler(...)`
   - `Sentry.Handlers.errorHandler(...)`
4) **Rebuild** y **deploy**.

### Render — Start Command
- Simple (sin instrumentación temprana):
  ```
  cd apps/api && npx prisma migrate deploy && node dist/server.js
  ```
- Con instrumentación temprana (recomendado):
  ```
  cd apps/api && npx prisma migrate deploy && node --import ./dist/sentry/instrument.js dist/server.js
  ```
  o con variable de entorno:
  ```
  NODE_OPTIONS=--import ./dist/sentry/instrument.js
  ```

### Tips
- Si tu build toma artefactos viejos, limpia antes de compilar:
  - En el Build Command antepone: `rm -rf apps/api/dist && ...`
  - O usa “Clear build cache & deploy” en Render.
- Asegúrate de tener `@sentry/node` >= 8 en `apps/api`.

### Compatibilidad
- Express / TypeScript / Node 22 (ESM). Si usas CommonJS, adapta los imports.
