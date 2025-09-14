Mixtli v1.11.0 — BACKEND FINAL (Render)
====================================
Rutas incluidas:
- `GET /api/health`
- `POST /api/presign` → URL firmado PUT hacia R2
- `GET /api/search` → listado simple desde R2 (sin DB)
- `POST /api/files/bulk` → delete/no-op move/copy (sin DB)
- `POST /api/files/rename` → nota (sin DB)
- `POST /api/files/transform` → rotar imagen con Sharp
- `POST /api/upload` → fallback de subida via backend (50 MB)

Variables de entorno (Render):
- PORT=3000
- R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
- R2_BUCKET=mixtli
- R2_KEY=...
- R2_SECRET=...
- ALLOWED_ORIGINS=https://lovely-bienenstitch-6344a1.netlify.app

Comandos Render:
- Build: `npm install --no-audit --no-fund`
- Start: `node server.js`

Nota CORS:
- Si tu dominio de Netlify cambia, actualiza ALLOWED_ORIGINS y la CORS policy del bucket R2.
Generado: 2025-09-14T22:08:51.102265Z
