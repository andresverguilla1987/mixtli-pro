# Render Hotfix: quitar Sentry v7 y desactivar Redis en runtime

Este paquete te da **dos scripts** para que el deploy en Render deje de intentar
conectarse a `127.0.0.1:6379` y para evitar errores de Sentry v7.

## Archivos
- `render/build.sh` — Build Command.
- `render/start.sh` — Start Command.

## Cómo usar en Render
1) Sube esta carpeta `render/` al repo (raíz del proyecto).
2) En tu servicio **apps/api** de Render:
   - **Build Command:** `bash render/build.sh`
   - **Start Command:** `bash render/start.sh`
3) (Opcional) Asegúrate de **no** tener variables `REDIS_URL`/`IOREDIS_URL` apuntando a localhost.
   Si usas Redis gestionado, pon su URL real; si no, simplemente no pongas nada.

## Qué hace
- Compila `apps/api/src` con **esbuild** → `apps/api/dist` (evita errores de tipos).
- Borra llamadas `Sentry.Handlers.*` en el JS compilado.
- Crea `dist/disable-redis.mjs` y lo **pre-carga** al arrancar:
  intercepta `redis` e `ioredis` para que **no hagan conexiones** (no-op).
- Si existe `dist/lib/redis.js` lo reemplaza por un stub compatible (`getRedis`, `tryRedisPing`, etc.).

## Notas
- Los logs deberían mostrar el **entrypoint** y, si algún módulo toca Redis, verás un aviso
  `[REDIS] ... stub activo (no-op).` en los logs.
- Si aún ves `ECONNREFUSED 127.0.0.1:6379`, confírma que Render está usando estos dos comandos
  y que el `render/` está en la rama que despliega.
