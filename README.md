# Mixtli API — server-upload (Render + GitHub)

Flujo sólido: el navegador envía a `/api/upload` (Render) y Render sube a **Cloudflare R2**.
- Sin CORS del navegador para subir.
- Devuelve `downloadUrl` temporal y `publicUrl` (si configuras PUBLIC_BASE_URL).

## Deploy (GitHub → Render)
1) Sube estos archivos a un repo (GitHub).
2) Render → New → Blueprint → selecciona el repo (usa `render.yaml`), o **Web Service → Connect Repo**:
   - Build: `npm ci`
   - Start: `node server.js`
3) Env vars requeridas:
   ```
   PORT=10000
   ALLOWED_ORIGIN=https://lovely-bienenstitch-6344a1.netlify.app,https://meek-alfajores-1c364d.netlify.app
   R2_ACCOUNT_ID=...
   R2_BUCKET=...
   R2_REGION=auto
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   PUBLIC_BASE_URL=  # opcional (r2.dev)
   ```

## Endpoints
- `GET /api/health` → `{ ok:true, mode:'server-upload', time: ... }`
- `POST /api/upload?filename=<name>&contentType=<mime>` → `{ status:'ok', key, downloadUrl, publicUrl? }`
- `GET /api/signget?key=<key>&expires=600` → `{ url, expiresIn }`

## Notas
- Límites: `200mb` (ajusta en `express.raw`).
- Agrega auth/token si quieres restringir `/api/upload`.
