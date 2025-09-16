# Mixtli Backend PRO (v4) — 2025-09-16

## Novedades
- Token de API (`x-mixtli-token`) — activa con `API_TOKEN` en Render.
- Presign **PUT/GET** con `expiresIn` y `filename` (para descarga amigable).
- Listado paginado: `GET /api/list?prefix=&limit=50&token=...`.
- Filtro de MIME por env `ALLOWED_MIME` (CSV).
- CORS robusto con `ALLOWED_ORIGINS` (JSON).

## Dependencias
```
npm i express @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Vars Render
```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=***
S3_SECRET_ACCESS_KEY=***
ALLOWED_ORIGINS=["https://tu-netlify.app"]
API_TOKEN=<opcional>
ALLOWED_MIME=image/jpeg,image/png,text/plain,application/pdf
```

## Start
`node server.js`
