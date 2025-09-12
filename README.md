# Mixtli API — server-upload (Render + GitHub)

Flujo sólido de producción: el navegador envía a `/api/upload` (Render) y Render sube a Cloudflare R2. Sin CORS del navegador.

## Deploy (GitHub → Render)
1) Sube estos archivos a un repo de GitHub.
2) Render → New → Blueprint → selecciona tu repo (usa `render.yaml`).
3) Completa las env vars marcadas como `sync:false` y deploy.

## Variables
- PORT=10000
- ALLOWED_ORIGIN=https://lovely-bienenstitch-6344a1.netlify.app,https://meek-alfajores-1c364d.netlify.app
- R2_ACCOUNT_ID=...
- R2_BUCKET=...
- R2_REGION=auto
- R2_ACCESS_KEY_ID=...
- R2_SECRET_ACCESS_KEY=...
- PUBLIC_BASE_URL=  # opcional (para r2.dev público)

## Probar
- GET /api/health → `{ ok:true, mode:'server-upload' }`
- POST /api/upload?filename=name&contentType=mime → `{ status:'ok', key, downloadUrl, publicUrl? }`
