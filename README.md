# Mixtli Mini v1.10.1

**Objetivo:** servidor ultra-minimal para generar prefirmas (PUT) directas a Cloudflare R2 (S3-compatible), con CORS estricto y endpoint de salud.

## Deploy rápido (Render)
1) Crear *Web Service* en Render (Node 22+).
2) Variables de entorno:
   - `PORT` = `10000`
   - `S3_ENDPOINT` = `https://<tu-accountid>.r2.cloudflarestorage.com`
   - `S3_BUCKET` = `<tu-bucket>`
   - `S3_REGION` = `auto`
   - `S3_FORCE_PATH_STYLE` = `true`
   - `S3_ACCESS_KEY_ID` = `<R2 Access Key ID>`
   - `S3_SECRET_ACCESS_KEY` = `<R2 Secret Access Key>`
   - `ALLOWED_ORIGINS` = `["https://<tu-netlify>.netlify.app"]`
3) Build Command: `npm install --no-audit --no-fund`
4) Start Command: `node server.js`

## Endpoints
- `GET /salud` (alias: `/api/health`) → estado + verificación ligera de bucket.
- `GET /api/list` → lista 50 objetos (para diagnóstico).
- `POST /api/presign` → body `{ "filename":"a.png", "contentType":"image/png" }` → regresa `url` (PUT), `key`, `expiresIn`.

## Notas de CORS
- Sólo permite `ALLOWED_ORIGINS`. Si recibes 403 CORS, agrega el dominio correcto (incluye https y subdominio).
- Preflight: `Access-Control-Allow-Headers: Content-Type, x-mixtli-token`.

## Demo Frontend (Netlify)
Carga `public/` en Netlify. Asegúrate de que `_redirects` haga proxy de `/api` a tu Render.

## Seguridad
- No subas tus llaves al cliente.
- `expiresIn` corto (5 min). Revoca llaves si sospechas exposición.
