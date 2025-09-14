# Mixtli — Full Backend (Render-ready)

Backend completo para **Render** con endpoints de **lista y subida**, más rutas de **preview**:

## Endpoints
- `GET /api/list?limit=160&prefix=public/` → lista objetos S3 (ordenados por fecha desc).  
  Respuesta: `{ items: [{ key, size, type, lastModified }] }`
- `POST /api/presign` → genera URL firmada **PUT** para subir.
  Body JSON: `{ filename, type, size, album }`  
  Respuesta: `{ key, url, signedUrl, expiresIn }`
- `POST /api/complete` → no-op (para compatibilidad).
- `GET /files/<path>` → **binario** para previews.
- `GET /api/raw?key=...` → **binario** por `key` (query).
- `GET /api/get?key=...` → **JSON** con `{"url": "<signed URL>"}`.

> Compatible con los frontends v1.2/v1.3 que te pasé (álbums, miniaturas, subida).

## Deploy en Render
1. Web Service (Node).
2. Build: `npm install`  
   Start: `npm start`
3. Variables:
   - `S3_BUCKET` (obligatoria)
   - `AWS_REGION` (`auto` para R2 o tu región)
   - `S3_ENDPOINT` (solo si usas R2, ej. `https://<account>.r2.cloudflarestorage.com`)
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
   - `ALLOWED_ORIGINS` = `https://lovely-bienenstitch-6344a1.netlify.app,https://meek-alfajores-1c364d.netlify.app`
   - *(opcionales)* `SIGNED_URL_TTL=3600`, `DEFAULT_PREFIX=public/`

## Notas
- `/api/presign` firma el `Content-Type`. El cliente enviará el mismo valor en el PUT.
- Si quieres carpetas/álbums, envía `album` en `presign` (ej. `"album":"eventos/2024"`).
- Con `_redirects` en Netlify:
```
/api/*    https://mixtli-pro.onrender.com/api/:splat   200!
/files/*  https://mixtli-pro.onrender.com/files/:splat 200!
```
- Si separas servicios (main + preview), apunta `/api/*` al **main** y `/files/*` al **preview**.

