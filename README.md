# Hotfix: Strip Sentry v7 Handlers en Render

## ¿Para qué sirve?
Si tu build sigue generando `dist/app.js` con:
- `app.use(Sentry.Handlers.requestHandler())`
- `app.use(Sentry.Handlers.tracingHandler())`
- `app.use(Sentry.Handlers.errorHandler())`

este script los elimina **en tiempo de arranque** antes de ejecutar tu servidor, para que no crashee en Sentry v8+.
Es un parche temporal para levantar el servicio de inmediato.

## Cómo usarlo en Render
1. Sube este archivo al repo (por ejemplo en `render/render-start-with-sentry-hotfix.sh`).
2. Dale permisos de ejecución (Render lo clona con permisos, pero localmente puedes: `git update-index --chmod=+x render/render-start-with-sentry-hotfix.sh`).
3. En Render, cambia el **Start Command** a:
```
bash render/render-start-with-sentry-hotfix.sh
```
4. Re-deploy. Con esto tu servicio ya no reventará por `Handlers.*`.

## Recomendación a mediano plazo
- Migra el código fuente a Sentry v8 (usa `Sentry.setupExpressErrorHandler(app)` y carga instrumentación con `--import`).
- O fija `@sentry/node@^7` si prefieres mantener la API antigua.
