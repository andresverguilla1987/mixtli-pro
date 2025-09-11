# Mixtli Mini — Proxy Netlify + Render + R2 (V2 con descarga)
Proyecto listo para:
- Subir desde Netlify → presign en Render → PUT directo a R2.
- Responder en `/api/complete` con **downloadUrl (GET presignado)** y, si aplicas, **publicUrl** (r2.dev).

## URLs ejemplo (ajusta si usas dominio propio)
- Netlify: https://meek-alfajores-1c364d.netlify.app
- Render (API): https://mixtli-pro.onrender.com

## Render — Variables
```
NODE_ENV=production
PORT=10000
# Opcional (por si llamas API directo desde el navegador)
ALLOWED_ORIGIN=https://meek-alfajores-1c364d.netlify.app
# R2
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxx
R2_BUCKET=mixtli
R2_REGION=auto
R2_ACCESS_KEY_ID=xxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxx
# Solo si tienes bucket/objeto público para r2.dev:
PUBLIC_BASE_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
```
### Build/Start (Render)
```
npm i express cors dotenv @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/signature-v4-crt
node server.js
```

## Netlify — Deploy
- Sube el contenido del ZIP (trae `static/`, `_redirects`, `_headers`, `server.js` por si quieres reference).
- Usa el **proxy** incluido en `_redirects`:
```
/api/*  https://mixtli-pro.onrender.com/:splat  200
/*      /index.html   200
```
- La UI usa `window.API_BASE=""` → llama a `/api/*` y Netlify reenvía a Render (cero CORS).

## R2 — CORS del bucket
Usa `r2_cors.json` y cambia el origen a tu dominio Netlify:
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://meek-alfajores-1c364d.netlify.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-version-id"],
    "MaxAgeSeconds": 3600
  }]
}
```

## Prueba rápida
1) Abrir Netlify → subir archivo.
2) Debe mostrar **downloadUrl** (GET presign) y, si configuraste PUBLIC_BASE_URL y tu bucket es público, **publicUrl** (r2.dev).

