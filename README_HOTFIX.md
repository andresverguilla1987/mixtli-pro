# Mixtli Hotfix v3

Este parche arregla dos cosas sin tocar tus comandos de build/start:
1) Rutas de salud para evitar 404 en `/` y exponer `/health` (también `/salud`, `/status`, `/ready`, `/live`).
2) Un wrapper de Redis "no-op" para que no vuelva a salir `ECONNREFUSED 127.0.0.1:6379` aunque no exista Redis.

## Qué incluye
- apps/api/src/app.ts              ← reemplaza al actual, añade health y exporta `PORT`
- apps/api/src/lib/redis.ts        ← stub seguro en memoria
- apps/api/src/types/shims.d.ts    ← typings mínimos por si compilas con tsc

## Cómo aplicar
1. Descomprime este ZIP en la **raíz del repo** (deja que sobreescriba archivos).
2. Commit & push para que Render redeploye.

## Probar
- GET `/`         → 200 `ok`
- GET `/health`   → 200 `{"status":"ok"}`
- GET `/salud`    → 200 `{"status":"ok"}`

El log ya no debería spamear `ECONNREFUSED 127.0.0.1:6379`.
