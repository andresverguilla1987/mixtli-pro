# Mixtli API (server-upload) — Render + GitHub

Un solo flujo sólido de producción: el navegador envía el archivo a **/api/upload** (Render) y el servidor lo sube a **Cloudflare R2**. Sin dependencias de CORS del navegador.

## Rápido (Render conectado a GitHub)
1. **Crea un repo en GitHub** (por ejemplo `mixtli-api`) y sube estos archivos.
2. En **Render** → New → **Web Service** → Connect Repo → elige el repo.
3. **Build Command:** `npm ci`  
   **Start Command:** `node server.js`
4. **Environment** (Add environment variables):
   ```
   PORT=10000
   R2_ACCOUNT_ID=<tu id de cuenta>
   R2_BUCKET=<tu bucket>
   R2_REGION=auto
   R2_ACCESS_KEY_ID=<tu key id>
   R2_SECRET_ACCESS_KEY=<tu secret>
   PUBLIC_BASE_URL=<opcional, r2.dev si público>
   ```
5. Deploy. El log debe mostrar: `Mixtli server-upload on :10000`

## Endpoints
- `GET /api/health` → `{ ok:true, mode:'server-upload', time: ... }`
- `POST /api/upload?filename=<name>&contentType=<mime>` → `{ status:'ok', key, downloadUrl, publicUrl? }`

## Netlify (frontend)
En tu sitio Netlify, usa `_redirects` para proxy:
```
/api/*  https://<TU-SERVICE>.onrender.com/:splat  200
/*      /index.html   200
```
