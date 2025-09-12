# Mixtli API — HARDENED (server-upload)

Incluye:
- **Token** por header `x-mixtli-token` (habilitado si `API_TOKEN` está seteado).
- **Allowlist de MIME** (`ALLOWED_MIME`) — por defecto solo imágenes.
- **Límite de tamaño** `MAX_BYTES` (default `200mb`).
- **Prefijo de key** `KEY_PREFIX` (default `uploads/`).

## Deploy (GitHub → Render)
1) Sube estos archivos a un repo.
2) Render → New → Blueprint (usa `render.yaml`) o Web Service:
   - Build: `npm ci --omit=dev`
   - Start: `node server.js`
3) Env vars:
```
PORT=10000
ALLOWED_ORIGIN=https://lovely-bienenstitch-6344a1.netlify.app
API_TOKEN=<tu-token-secreto>                 # opcional pero recomendado
ALLOWED_MIME=image/jpeg,image/png,image/webp,image/gif
MAX_BYTES=200mb
KEY_PREFIX=uploads
R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_REGION=auto
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
PUBLIC_BASE_URL=https://pub-<hash>.r2.dev     # opcional
```
