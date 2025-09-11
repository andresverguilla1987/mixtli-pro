# Mixtli Backend FIX — Render (2025-09-11)

Soluciona:
- **CORS bloqueado para null** → ahora permite `Origin: null` (file://) y lista blanca por `ALLOWED_ORIGINS`.
- **ERR_MODULE_NOT_FOUND dotenv** → se incluye `dotenv` en `package.json`.

## Pasos (Render)
1. Sube estos archivos al repo del servicio.
2. En Render (Environment → Environment Variables), agrega:
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`
   - `ALLOWED_ORIGINS` (ej: `https://tu-sitio.netlify.app,http://localhost:8080`)
   - (opcional) `R2_EXPIRES`, `PORT`
3. **Start Command**: `node server.js`
4. Redeploy. Comprueba:
   - `https://TU-API.onrender.com/api/health` → 200 JSON
   - `https://TU-API.onrender.com/api/presign?filename=ping.txt&contentType=text/plain` → JSON (con url/method)

## Notas
- Si no quieres permitir `file://`, borra la línea `if (!origin) return cb(null, true);` del CORS.
- `R2_PUBLIC_BASE` debe ser el dominio público del bucket (p.ej. `https://pub-xxxx.r2.dev`).
