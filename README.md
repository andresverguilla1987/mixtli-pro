# Mixtli API — server-upload con CacheControl
- Cache fuerte para imágenes: `Cache-Control: public, max-age=31536000, immutable`
- Token opcional via `API_TOKEN` (`x-mixtli-token` en cliente)
- Allowlist MIME (`ALLOWED_MIME`), límite `MAX_BYTES`, prefijo `KEY_PREFIX`

## Deploy (GitHub → Render)
1) Sube este contenido a tu repo.
2) Render → Blueprint (usa `render.yaml`) o Web Service:
   - Build: `npm ci --omit=dev`
   - Start: `node server.js`
3) Env vars:
```
PORT=10000
ALLOWED_ORIGIN=https://lovely-bienenstitch-6344a1.netlify.app
API_TOKEN=<tu-token>            # opcional
ALLOWED_MIME=image/jpeg,image/png,image/webp,image/gif
MAX_BYTES=200mb
KEY_PREFIX=uploads
R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_REGION=auto
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
PUBLIC_BASE_URL=https://pub-<hash>.r2.dev
```
