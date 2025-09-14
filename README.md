# Mixtli — Preview Backend (Render-ready)

Backend mínimo para **Render** que habilita *previews* de archivos desde R2/S3:

- `GET /files/<path>` → devuelve **binario** (ideal para miniaturas en el frontend)
- `GET /api/raw?key=...` → devuelve **binario** por `key` (query)
- `GET /api/get?key=...` → devuelve **JSON** con `{"url": "<signed URL>"}` (el frontend v1.2+ lo sigue solo)

> **Ventaja:** Si usas estas rutas desde **Netlify** con proxy (_redirects_), evitas CORS en previews.

---

## Deploy en Render

1. **Nuevo Web Service** → *Node*  
   - Repo: puedes subir este ZIP como repo o cargarlo directo.
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Environment** (Variables):
   - `S3_BUCKET` = (tu bucket)
   - `AWS_REGION` = `auto` (R2) o la región S3
   - `S3_ENDPOINT` = `https://<account>.r2.cloudflarestorage.com` (para R2). *Déjalo vacío si usas AWS S3.*
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
   - `ALLOWED_ORIGINS` = `https://lovely-bienenstitch-6344a1.netlify.app,https://meek-alfajores-1c364d.netlify.app`
   - *(opcional)* `SIGNED_URL_TTL` (segundos, por defecto 3600)
   - *(Render pone `PORT` solo)*
5. Deploy. Verás en logs: `Mixtli Preview listening on 10000`.

### Probar
- `GET /files/public/IMG.jpg` → debe mostrar la imagen.  
- `GET /api/raw?key=public/IMG.jpg` → igual, binario.  
- `GET /api/get?key=public/IMG.jpg` → `{"url": "..."}`.

> Si `/files/...` funciona, el frontend puede usar esa ruta y **no depende de CORS del bucket**.

---

## Integración con tu frontend (Netlify)

En tu `_redirects` del frontend, agrega (ya lo tienes en los ZIPs que te pasé):

```
/api/*  https://mixtli-pro.onrender.com/api/:splat   200!
/files/*  https://mixtli-pro.onrender.com/files/:splat 200!
```

Así, el navegador llama a `/api/*` y `/files/*` **en tu mismo dominio** (Netlify), y Netlify reenvía a Render.

---

## Notas

- Este backend **no** implementa `list/presign/complete`. Mantén esos endpoints en tu servicio principal tal como los tienes. Este servicio es **complementario para previews** (o puedes copiar el código a tu `server.js` existente).
- Si ya tienes un `server.js` en Render, copia el bloque de rutas de este repo y **monta**:
  - `app.get('/files/*', ...)`
  - `app.get('/api/raw', ...)`
  - `app.get('/api/get', ...)`

