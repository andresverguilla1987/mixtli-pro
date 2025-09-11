# Mixtli — Netlify All‑in‑One (2025-09-11)

Frontend y backend en el **mismo** repo usando **Netlify Functions**.
No necesitas Render ni CORS — todo sale del mismo dominio.

## Deploy (3 minutos)
1. Sube TODO este folder a un repo (rama `main`).
2. En Netlify → **Add new site → Import from Git** (elige tu repo).
3. En **Site settings → Environment variables**, agrega:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - `R2_PUBLIC_BASE` (por ej. `https://pub-xxxx.r2.dev`)
   - (opcional) `R2_EXPIRES` (segundos, default 3600)
4. Deploy → abre tu sitio:
   - `/api/health` debe responder JSON 200 (desde **esta app**).
   - `/api/presign?filename=ping.txt&contentType=text/plain` debe responder JSON.
5. En la home, sube un archivo → verás el `publicUrl`.

### Notas
- Si cambias los ENV, redeploya el sitio para que los lea la función.
- La función usa **AWS SDK v3** con `node_bundler = esbuild`.
