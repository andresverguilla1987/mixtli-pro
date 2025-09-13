# Mixtli — CORS + Presign (R2) — Paquete mínimo

Este paquete tiene:
- `server.js` (Express) con **CORS estricto**, `OPTIONS 204`, `/api/health` y `/api/presign` (PUT a R2).
- `public/upload.html` para probar el flujo **presign → PUT directo** a Cloudflare R2.
- `r2_cors.json` ejemplo de política CORS para el bucket.
- `.env.example` con variables necesarias.

---

## 1) Render (backend)

1. Crea un servicio **Web Service** en Render apuntando a este repo/código.
2. **Runtime**: Node 18+ (Render suele usar 22.x — OK).
3. **Build Command**: `npm install --no-audit --no-fund`
4. **Start Command**: `node server.js`
5. En **Environment** agrega estas variables:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - (opcional) `R2_PUBLIC_BASE` → `https://<bucket>.<account>.r2.cloudflarestorage.com`
   - `ALLOWED_ORIGINS` → `https://lovely-bienenstitch-6344a1.netlify.app`
   - `PORT` → `10000`
6. Deploy.

### Pruebas rápidas

**Preflight al backend:**
```bash
curl -i -X OPTIONS https://<tu-render>.onrender.com/api/health \
  -H "Origin: https://lovely-bienenstitch-6344a1.netlify.app" \
  -H "Access-Control-Request-Method: GET"
```

**Health:**
```bash
curl -i https://<tu-render>.onrender.com/api/health
```

---

## 2) Cloudflare R2 — CORS del bucket

En **R2 → Bucket → CORS**, pega el contenido de `r2_cors.json`:

```json
[
  {
    "AllowedOrigins": ["https://lovely-bienenstitch-6344a1.netlify.app"],
    "AllowedMethods": ["GET","PUT","HEAD","POST","DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag","x-amz-request-id","x-amz-version-id"],
    "MaxAgeSeconds": 86400
  }
]
```

> Si quieres estricta, reemplaza `"*"` por una lista que incluya al menos `content-type`.

---

## 3) Netlify (frontend de prueba)

- Sube la carpeta `public/` o integra `public/upload.html` dentro de tu sitio.
- Asegúrate que `public/config.js` apunte al **backend en Render**:
  ```js
  window.API_BASE = "https://mixtli-pro.onrender.com";
  ```

---

## 4) Subida desde `upload.html`

1. Abre `https://<tu-netlify>/upload.html` (o la ruta donde lo coloques).
2. Elige un archivo (máx. 50 MB).
3. Click **Subir**:
   - Pide `/api/presign` al backend.
   - Hace `PUT` directo a R2 (solo header `Content-Type`).
4. Verás la `key` y un `publicUrl` de referencia.

---

## 5) Checklist anti “Failed to fetch”

- Domain exacto en **ALLOWED_ORIGINS** (backend) y en CORS del **bucket**.
- No agregues headers extras en el `PUT` a R2 (solo `Content-Type`).
- No uses `mode: "no-cors"`.
- Siempre HTTPS en Netlify y Render.

¡Listo!