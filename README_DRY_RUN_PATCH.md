# Patch: DRY_RUN_EMAIL para pruebas seguras

## ¿Qué hace?
Cuando `DRY_RUN_EMAIL=1`, **no se envían correos reales**. El sistema:
- Renderiza la plantilla.
- Imprime un log `[MAIL:DRY_RUN]` con `to`, `subject` y un preview del HTML.
- Devuelve `{ dryRun: true }` al caller.

## Cómo habilitarlo
- Local: añade `DRY_RUN_EMAIL=1` en `.env`.
- Render: agrega env var `DRY_RUN_EMAIL` con valor `1` (en Environment).

## Cómo volver a enviar real
- Quita la variable o pon `DRY_RUN_EMAIL=0` y redeploy.

## Archivos afectados
- `src/lib/mailer.js` (reemplazo completo con soporte DRY).
- `.env.example` y `.env.render.example` (añaden la variable).

> Recomendado: mantener DRY en `1` hasta terminar tus pruebas con Postman/Runner.
