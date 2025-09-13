# Mixtli Server v2

Endpoints claves:
- `POST /api/public` — alterna público/privado (modo `tag` por defecto)
- `GET /api/zip?prefix=...` — entrega ZIP en streaming

## Variables de entorno (Render)
- `PORT=10000`
- `ALLOWED_ORIGINS=https://lovely-bienenstitch-6344a1.netlify.app,https://meek-alfajores-1c364d.netlify.app`
- `R2_BUCKET=mixtli`
- `R2_ACCOUNT_ID=...`
- `R2_ACCESS_KEY_ID=...`
- `R2_SECRET_ACCESS_KEY=...`
- `R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com` (opcional)
- `R2_PUBLIC_BASE=https://mixtli.<account>.r2.cloudflarestorage.com` (si el bucket tiene lectura pública)
- `PUBLIC_TOGGLE_MODE=tag` (o `prefix`)
- `PUBLIC_PREFIX=` y `PRIVATE_PREFIX=_private/` (si usas `prefix`)
- `ZIP_MAX_KEYS=2000`
- `MAX_UPLOAD_MB=50`

## Comandos Render
- Build: `npm install --no-audit --no-fund`
- Start: `node server.js`
