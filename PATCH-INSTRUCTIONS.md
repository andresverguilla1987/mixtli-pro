# Cómo aplicar este parche

1) Copia el contenido del zip en la raíz del repo (respetando las rutas).
   - Crea/mezcla los directorios `apps/api/src/routes/` y `apps/api/src/demo/` si no existen.
   - Crea/mezcla `render/cron/`.

2) Edita `apps/api/src/app.ts` y monta el router:

   ```ts
   import mountCron from './routes/cron';
   // …después de inicializar `app`:
   mountCron(app);
   ```

3) Sube `CRON_KEY` como secret en **ambos** servicios:
   - Web service (para que el endpoint lo valide)
   - Cron Job (para que el curl pase el header correcto)

4) Con blueprint (`render.yaml`):
   - Fusiona `render/render.cron.yaml` con tu `render.yaml` existente (o usa ese archivo tal cual si prefieres un repo separado).

5) Alternativa sin blueprint:
   - Crea el cron job en el dashboard y usa `startCommand: bash render/cron/reset-demo.sh`.

6) Programa (UTC). Ejemplos:
   - Todos los días 09:00 UTC: `0 9 * * *`
   - Cada hora en el minuto 5: `5 * * * *`

7) Prueba manual:
   ```bash
   curl -i -X POST https://mixtli-pro.onrender.com/internal/cron/refresh-demo \
     -H "x-cron-key: $CRON_KEY" -d '{}'
   ```
