# Mixtli Uploader Netlify Ready

Repositorio mínimo para GitHub/Netlify.

## Qué incluye
- `index.html` — Uploader standalone v2 (test health/presign, fallback manual).
- `netlify.toml` — Proxy `/api/*` a `https://mixtli-pro.onrender.com/api/:splat` (misma origin, sin CORS).

## Deploy
1. Sube esto a un repo (rama `main`).
2. Conecta a Netlify → Build command vacío, Publish directory `.` → Deploy.
3. Abre `https://TU-SITIO.netlify.app`.
4. En la página:
   - **Probar /api/health** → debe responder 200.
   - **Probar presign** → debe responder JSON.
   - Elige archivo → **Subir**.

> Si tu API cambia, edita `netlify.toml` y vuelve a desplegar.
