
# Mixtli API — Upload 50MB (Express + Multer + Cloudflare R2)

Backend listo para Render. Acepta archivos de **hasta 50 MB**, maneja **CORS** y sube a **Cloudflare R2** (API S3).

## Deploy en Render

1. Crea un **Web Service** desde este ZIP (o desde GitHub).
2. **Build Command**: `npm install --no-audit --no-fund`
3. **Start Command**: `node server.js`
4. **Environment** (Settings → Environment):
   - `ALLOWED_ORIGINS=https://lovely-bienenstitch-6344a1.netlify.app`
   - `MAX_UPLOAD_MB=50`
   - `R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com`
   - `R2_BUCKET=<tu-bucket>`
   - `R2_ACCESS_KEY_ID=<key>`
   - `R2_SECRET_ACCESS_KEY=<secret>`
   - `PUBLIC_BASE_URL=https://pub-xxxxxxxx.r2.dev` (opcional para link público)
5. **Manual Deploy**.

## Endpoints

- `GET /api/health` → `{ ok, version, maxMB }`
- `POST /api/upload`  
  FormData:
  - `file` (campo de archivo)
  - `folder` (opcional, por ejemplo `users/123`)

Respuesta `201`:
```json
{ "ok": true, "key": "users/123/archivo.jpg", "publicUrl": "https://..." }
```

## Notas

- **CORS**: responde OPTIONS y permite `Content-Type,x-mixtli-token`.  
- **No** seteamos manualmente `Content-Type` en el frontend cuando usamos `FormData`.
- Si ves `413 Payload Too Large`, confirma que esta app (con Multer) es la que corre en Render.

## Local

```
cp .env.example .env
npm i
node server.js
```

Abre `http://localhost:10000/api/health`.
