# Mixtli Backend PRO (v5) — 2025-09-16

## Novedades vs v4
- **/api/move** (renombrar/mover) con CopyObject + DeleteObject
- **/api/head** para metadata rápida
- **ROOT_PREFIX** opcional para restringir prefijos (multi-tenant)
- Resto: token, presign PUT/GET, paginado, filtros MIME, CORS, etc.

## Dependencias
```
npm i express @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Environment (Render)
```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=***
S3_SECRET_ACCESS_KEY=***
ALLOWED_ORIGINS=["https://lovely-bienenstitch-6344a1.netlify.app"]
API_TOKEN=<opcional>
ALLOWED_MIME=image/jpeg,image/png,text/plain,application/pdf
ROOT_PREFIX=postman/   # opcional
```

**Start:** `node server.js`
