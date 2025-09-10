# Mixtli — Ultimate
Backend Node (root) + Frontend (Netlify). R2 presign listo.

## Render
- Build: `npm install --omit=dev`
- Start: `node server.js`
- Env:
```
R2_BUCKET=mixtli
R2_ACCOUNT_ID=8351c372def0e354a3196aff085f0ae
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
PUBLIC_BASE_URL=https://pub-f411a341ba7f44a28234293891897c59.r2.dev
ALLOWED_ORIGINS=http://localhost:5173,https://meek-alfajores-1c364d.netlify.app
PRESIGN_EXPIRES=3600
MAX_UPLOAD_MB=50
ALLOWED_MIME_PREFIXES=image/,application/pdf
```
- Endpoints: `/health`, `/version`, `/presign`, `/download/:key`

## Netlify
- Publica `frontend/`.

