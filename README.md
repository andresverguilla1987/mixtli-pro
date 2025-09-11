# Mixtli API — CORS + Presign R2 (Express, Node)

API mínima para arreglar **CORS** y emitir **presign PUT** para Cloudflare R2.
Listo para Render, Railway, Fly.io o cualquier Node host.

## 🚀 Endpoints
- `GET /api/health` — healthcheck
- `GET /api/presign?filename=NAME&contentType=TYPE`
- `POST /api/presign` — `{ filename, contentType }`

**Respuesta:**

```json
{
  "key": "1757549600482-f48917-archivo.jpg",
  "url": "https://<account>.r2.cloudflarestorage.com/<key>?X-Amz-...",
  "method": "PUT",
  "headers": { "Content-Type": "image/jpeg" },
  "publicUrl": "https://pub-xxxx.r2.dev/<key>",
  "expiresIn": 3600
}
```

## ⚙️ Variables de entorno (.env)
Copia `.env.example` a `.env` y rellena:

- `R2_ACCOUNT_ID` — tu Account ID (R2)
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — Access Keys
- `R2_BUCKET` — nombre del bucket
- `R2_PUBLIC_BASE` — dominio público `r2.dev` del bucket
- `R2_EXPIRES` — segundos del presign (default 3600)
- `ALLOWED_ORIGINS` — **lista separada por comas** con tus frontends (Netlify/Pages/localhost)

> Si quieres abrir **solo esta API** sin restricciones (demo), puedes cambiar el middleware CORS a `origin: "*"` y quitar `credentials`.

## 🧪 Probar
1. `npm install`
2. `npm start`
3. Visita: `http://localhost:10000/api/health`
4. Presign: `http://localhost:10000/api/presign?filename=hola.jpg&contentType=image/jpeg`

## ☁️ Deploy en Render
- New → Web Service → el repo/zip
- Runtime Node 20+
- Build Command: *(vacío)*
- Start Command: `node server.js`
- Agrega vars de entorno del `.env`
- Dominios permitidos en `ALLOWED_ORIGINS`: tu Netlify/Pages (ej. `https://mixtli-v11.netlify.app`)

## 🧰 R2 CORS del bucket
Ajusta la política del bucket para permitir la subida desde el navegador (PUT) y el preflight (OPTIONS).

Ejemplo JSON (guárdalo como referencia en `r2_cors.json`):

```json
[
  { "AllowedOrigins": ["*"], "AllowedMethods": ["GET","HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3000 },
  { "AllowedOrigins": ["https://tu-sitio.netlify.app","http://localhost:5173"], "AllowedMethods": ["PUT","GET","HEAD","OPTIONS"], "AllowedHeaders": ["*"], "ExposeHeaders": ["ETag","x-amz-request-id"], "MaxAgeSeconds": 3000 }
]
```

> En producción, reemplaza `*` por tus dominios exactos.
