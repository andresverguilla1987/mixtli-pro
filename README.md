# Mixtli Env Patch (R2/S3) — Drop-in
Agrega un **resolver de variables** y una ruta de depuración para que el backend detecte `S3_BUCKET` (o alias) y deje de fallar.

## Archivos
- `env-resolver.js`
- `routes-debug.js`
- `server.example.js`
- `README.md`

## Integración rápida
1) Copia `env-resolver.js` y `routes-debug.js` al root del backend (junto a tu `server.js`).  
2) En tu `server.js` añade al inicio:
```js
const { getEnv, logEnvSafe, assertEnv, buildS3Client } = require('./env-resolver');
const { attachDebug } = require('./routes-debug');
const ENV = getEnv(); logEnvSafe(ENV); assertEnv(ENV);
const s3 = buildS3Client(ENV);
const BUCKET = ENV.S3_BUCKET;
attachDebug(app, ENV); // si ya tienes app
```
3) Usa `BUCKET` en tus comandos S3.  
4) Variables en Render:
```
S3_ENDPOINT=https://8351c372dedf0e354a3196aff085f0ae.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=<Access Key ID>
S3_SECRET_ACCESS_KEY=<Secret>
R2_BUCKET=mixtli
BUCKET=mixtli
DEBUG_ENV=true
```
5) Manual Deploy → **Clear build cache & deploy**.  
6) Prueba `GET /debug/env` (temporal) y tu flujo Postman.
