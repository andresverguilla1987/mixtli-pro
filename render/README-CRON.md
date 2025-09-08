# Cron de refresh de DEMO (Render)

Hay dos formas de activarlo:

## A) Con `render.yaml`
1. Copia `render/render.cron.yaml` dentro de tu `render.yaml` principal (o súbelo como archivo único si no tienes uno).
2. Sube `render/cron/reset-demo.sh` al repo y dale permisos de ejecución: `git update-index --chmod=+x render/cron/reset-demo.sh`.
3. En Render, **New > Blueprint** y apunta al repo (o actualiza el servicio si ya usas blueprint).
4. Define el secret `CRON_KEY` en el cron job / o usa el `sync:false` del YAML para marcarlo como secreto.
5. Ajusta la `schedule` (está en **UTC**).

## B) Desde el Dashboard (sin YAML)
1. **New > Cron Job**.
2. `Start Command`: `bash render/cron/reset-demo.sh`
3. Variables de entorno en el cron job:
   - `DEMO_REFRESH_URL=https://mixtli-pro.onrender.com/internal/cron/refresh-demo`
   - `CRON_KEY=<pon-tu-valor-secreto>`
4. `Schedule`: cron estándar en UTC (p.ej. `0 15 * * *` para 09:00 en CDMX si estás en UTC-6).

## Endpoints agregados
- `POST /internal/cron/refresh-demo` con header `x-cron-key: <CRON_KEY>`

## Cómo montar el router en tu `app.ts`
Agrega esto en tu `apps/api/src/app.ts` después de crear `app`:

```ts
import mountCron from './routes/cron';
mountCron(app);
```

## Seguridad
- El endpoint requiere `x-cron-key`. Guarda ese valor solo en Render (cron job y web app).
- No expongas `CRON_KEY` en el repositorio.
