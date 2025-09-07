# Mixtli API — Sentry v8+ Fix (ZIP)

**Qué incluye**
- `apps/api/src/sentry/instrument.ts` (nuevo)
- `apps/api/src/app.ts.example` (de referencia tras la migración)
- `patches/app-ts-sentry-v8.diff` (parche opcional)
- `.env.example.additions` (variables a agregar)
- `render/README_RENDER.md` (cómo configurarlo en Render)

## Pasos rápidos
1) **Copia** `apps/api/src/sentry/instrument.ts` a tu repo en esa ruta exacta.
2) **Migra tu `app.ts`:**
   - Elimina en tu código cualquier uso de:
     ```ts
     // v7 (quitar)
     // app.use(Sentry.Handlers.requestHandler());
     // app.use(Sentry.Handlers.tracingHandler());
     // app.use(Sentry.Handlers.errorHandler());
     ```
   - Asegúrate de **importar** Sentry:
     ```ts
     import * as Sentry from "@sentry/node";
     ```
   - Inserta **una sola** línea al final de tus rutas (antes de tu middleware de errores custom si lo tienes):
     ```ts
     Sentry.setupExpressErrorHandler(app);
     ```
   - Si te sirve, **compara** con `apps/api/src/app.ts.example`.
   - Alternativa: intenta aplicar `patches/app-ts-sentry-v8.diff` con `git apply`.
3) **Compilación TS**: Tu `instrument.ts` compila a `dist/sentry/instrument.js`. No olvides que TypeScript lo incluya (si tu `tsconfig` tiene `include` muy cerrado, añádelo).
4) **Render (elige una):**
   - **A. Start Command**
     ```bash
     cd apps/api && npx prisma migrate deploy && node --import ./dist/sentry/instrument.js dist/server.js
     ```
   - **B. NODE_OPTIONS**
     - En Render > Environment:
       - `NODE_OPTIONS=--import ./dist/sentry/instrument.js`
     - Mantén tu start command actual.
5) **Variables de entorno**
   - `SENTRY_DSN` (DSN de tu proyecto en Sentry)
   - `SENTRY_TRACES_SAMPLE_RATE` (p.ej. `0.2` en prod)
   - `SENTRY_PROFILES_SAMPLE_RATE` (opcional, p.ej. `0`)
6) **Re-deploy**. Listo.

## Notas
- En Sentry v8+ desaparecen `Sentry.Handlers.*`. Se sustituye por **`Sentry.setupExpressErrorHandler(app)`**.
- La instrumentación debe cargarse **antes** de tu app (de ahí `--import`).

