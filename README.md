# Mixtli API — server-upload (patched)
- Usa `getSignedUrl` (sin @aws-sdk/hash-node) para evitar errores ETARGET en Render.
- Flujo: /api/upload recibe el archivo y lo sube a Cloudflare R2. Devuelve downloadUrl (temporal) y publicUrl (si configuras PUBLIC_BASE_URL).

## Deploy
1) Sube a GitHub.
2) Render: New → Blueprint (usa render.yaml) **o** Web Service (Build: npm ci --omit=dev, Start: node server.js).
3) Env vars: PORT, ALLOWED_ORIGIN, R2_* y PUBLIC_BASE_URL (opcional).

## Endpoints
- GET /api/health
- POST /api/upload?filename=&contentType=
- GET /api/signget?key=&expires=600
