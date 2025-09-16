# Mixtli — Opción 3 (server.js parchado)

Este `server.js` ya trae:
- Fallback del bucket: `S3_BUCKET || R2_BUCKET || BUCKET`
- Path-style para R2
- Parseo robusto de `ALLOWED_ORIGINS`
- Rutas: `/salud`, `/api/presign` (PUT), `/api/list`, `/_envcheck`

## Cómo usar
1) **Reemplaza** tu `server.js` por este archivo.
2) Asegúrate de tener estas envs en Render:
```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
ALLOWED_ORIGINS=["https://tu-netlify"]
```
3) **Start Command**: `node server.js`
4) **Manual Deploy → Clear build cache & deploy**.

## Probar
- `GET /salud` → 200
- `POST /api/presign` con body:
```
{ "key":"postman/test.txt", "contentType":"text/plain", "method":"PUT" }
```
- `PUT` a la URL firmada → 200/201/204
- `GET /api/list?prefix=postman/` → lista el objeto
