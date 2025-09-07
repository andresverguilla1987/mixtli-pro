# Mixtli Hotfix v2 (root & Redis safe)

Este parche hace dos cosas:
1) Agrega rutas `/`, `/health` y `/salud` con 200 OK para que el healthcheck no marque 404.
2) Cambia `apps/api/src/lib/redis.ts` por una versión **segura** que no truena si no hay Redis o no se puede conectar.

## Pasos

1. Copia el contenido del ZIP en la **raíz** del repo (respeta carpetas).
2. Abre `apps/api/src/app.ts` y agrega:
   ```ts
   import rootHealth from './health';
   // ...
   app.use('/', rootHealth);
   ```
3. Deploy normal. Opcional: en Render usa `/health` como Health Check Path.
4. Si existen variables REDIS_* pero no tienes servicio Redis corriendo, bórralas o déjalas: el wrapper ya no truena.

## Verificación
- `GET /` -> 200 "ok"
- `GET /health` -> 200 `{"status":"ok"}`
- No deben aparecer errores `ECONNREFUSED 127.0.0.1:6379` de forma continua.
