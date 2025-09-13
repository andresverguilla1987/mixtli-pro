# Mixtli Backend (final)
Endpoints:
- `POST /api/presign` → firma `PUT` para R2 (50 MB, MIME whitelist).
- `POST /api/complete` → valida objeto subido y devuelve `getUrl` temporal.
- `GET /api/health`, `GET /api/debug`.

## Render (dónde implementar)
- **Build:** `npm install --no-audit --no-fund`
- **Start:** `node server.js`
- **ENV obligatorias:**
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
  - `ALLOWED_ORIGINS=https://TU-SITIO.netlify.app` (agrega otros si corresponde)
  - `ALLOWED_MIME_PREFIXES=image/,application/pdf`
  - `PORT=10000`

## CORS en R2 (Bucket)
Ejemplo:
```json
[
  {
    "AllowedOrigins": ["https://TU-SITIO.netlify.app","http://localhost:5173"],
    "AllowedMethods": ["GET","PUT","HEAD","POST","DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag","x-amz-request-id","x-amz-version-id"],
    "MaxAgeSeconds": 86400
  }
]
```

## Probar
- `public/index.html` (opcional) puede llamar a `/api/presign` y hacer PUT.
