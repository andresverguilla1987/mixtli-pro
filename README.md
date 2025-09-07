# Render Redis Fix (Mixtli)

Esto evita `ECONNREFUSED 127.0.0.1:6379` usando una URL de Redis/Key Value de Render (o Upstash, etc.).
Si no hay `REDIS_URL`, la app arranca igual y solo avisa que Redis está deshabilitado.

## Archivos
- `apps/api/src/lib/redis.ts` — cliente robusto con autodetección TLS (`rediss://`).
- `apps/api/src/bootstrap/checks.ts` — chequeo simple en el arranque (log friendly).

## Cómo integrarlo en tu código
1) Copia estos archivos a tu repo en las mismas rutas.
2) En tu `apps/api/src/server.ts` (o donde arrancas el HTTP), antes de `app.listen(...)`:
   ```ts
   import { bootChecks } from "./bootstrap/checks";
   await bootChecks();
   ```
   *(Si tu `server.ts` no es async, mete `bootChecks().catch(console.error)` justo antes del listen.)*
3) Sustituye tus imports de Redis por el helper cuando lo uses:
   ```ts
   import { getRedis } from "./lib/redis";
   const redis = await getRedis(); // puede ser null si no hay REDIS_URL
   if (redis) {
     await redis.set("hola", "mixtli");
   }
   ```

## Variables de entorno (Render → Environment)
- `REDIS_URL` (o `KV_URL`): usa la **Internal Connection String** de tu instancia en Render.
  - Ejemplo: `rediss://default:password@redis-xxxx.internal.render.com:6379`
  - Si es `rediss://`, el cliente activa TLS automáticamente.
- Si no configuras `REDIS_URL`, la app arranca y solo loguea que no hay Redis.

## Start Command (sin cambios)
- Si ya usas Sentry instrument con `--import`, mantenlo.
- Si no, puedes dejar: `cd apps/api && npx prisma migrate deploy && node dist/server.js`

## Nota
- Si antes conectabas a `127.0.0.1:6379`, eso no funcionará en Render: Redis corre en otro servicio.
