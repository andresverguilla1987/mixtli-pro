# Mixtli — CORS + Presign (R2) — v2 (robusto)

Cambios v2:
- **CORS antes** de body parser.
- **Normalización** de Origin (lowercase y sin `/` final).
- `app.options('*', cors())` para que las respuestas de preflight incluyan headers ACAO.
- Env `ALLOWED_ORIGINS` con múltiples dominios separados por coma (sin espacios ni comillas).

## Render
Build: `npm install --no-audit --no-fund`  
Start: `node server.js`

ENV requeridas:
```
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
ALLOWED_ORIGINS=https://lovely-bienenstitch-6344a1.netlify.app,http://localhost:5173
PORT=10000
```
*(opcional)* `R2_PUBLIC_BASE=https://<bucket>.<account>.r2.cloudflarestorage.com`

## CORS R2
Usa `r2_cors.json` en tu bucket.

## Verificación rápida
Preflight backend:
```bash
curl -i -X OPTIONS https://mixtli-pro.onrender.com/api/health \
  -H "Origin: https://lovely-bienenstitch-6344a1.netlify.app" \
  -H "Access-Control-Request-Method: GET"
```

Preflight presigned (reemplaza URL):
```bash
curl -i -X OPTIONS "PRESIGNED_URL" \
  -H "Origin: https://lovely-bienenstitch-6344a1.netlify.app" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type"
```
