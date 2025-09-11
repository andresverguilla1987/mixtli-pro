# Mixtli Mini — Netlify + Render + R2 (CORS fixed)

Minimal, estable y lista para pruebas end-to-end (presign → PUT → confirmación).

## Estructura
- `server.js` — API en Express (Render). Endpoints:
  - `GET /api/health` — ping.
  - `POST /api/presign` — devuelve URL presignada S3 compatible (Cloudflare R2) para `PUT`.
  - `POST /api/complete` — (opcional) eco del key/url.
- `static/index.html` + `static/app.js` — UI fija (Design Lock v1) hospedada en Netlify.
- `_headers` y `_redirects` — cache bust y CORS seguro en Netlify.
- `netlify.toml` — alternativa para headers/redirects.
- `r2_cors.json` — política CORS para tu bucket R2.
- `.env.example` — variables necesarias en Render.

## Variables de entorno (Render)
Crea estas en el servicio Render (Environment → Environment Variables):

```
NODE_ENV=production
PORT=10000
# R2/S3
R2_ACCESS_KEY_ID=xxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxx
R2_ACCOUNT_ID=xxxxxxxxxxxxxxx   # account id de Cloudflare (no zone id)
R2_BUCKET=mixtli
R2_REGION=auto
# Frontend permitido (tu dominio Netlify sin slash final)
ALLOWED_ORIGIN=https://<tu-sitio>.netlify.app
```

> Si usas dominio propio en Netlify, ponlo aquí. Puedes separar varios orígenes con coma.

## Instalación API (Render)
```
npm init -y
npm i express cors dotenv @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/signature-v4-crt
node server.js
```

### Build Command (Render)
```
node server.js
```
### Start Command (Render)
```
node server.js
```

## Política CORS en R2
Ve a Cloudflare → R2 → tu bucket → Settings → CORS → pega `r2_cors.json`.

## Netlify
Sube `static/` como sitio. Incluye `_headers` y `_redirects` en la raíz del deploy. Alternativa: usar `netlify.toml`.

## Pruebas rápidas
1. Abre tu sitio en Netlify. En DevTools, desactiva cache (Network tab) y Hard Reload.
2. Sube un archivo pequeño y verifica que:
   - `POST /api/presign` devuelve `url`, `key`, `expiresIn`.
   - `PUT` directo a R2 retorna `200`.
   - `complete` muestra enlace de descarga (privado si tu bucket es privado; con presign GET podrías habilitar descarga).

### cURL de verificación (desde tu PC)
Usa la URL presignada que regrese la API:
```
curl -X PUT --upload-file ./ping.txt "<URL_PRESIGNADA>"
```

Si responde `200`, CORS y firma están bien.

## Notas
- La UI no maneja login/registro: flujo de “Subir/Compartir” simple y estable (Design Lock v1).
- Si quieres ocultar pestañas de auth, ya viene simplificado.
- Si migras a dominio propio, ajusta `ALLOWED_ORIGIN` en Render y `Access-Control-Allow-Origin` en `_headers`.
