Mixtli - Listing Fix (ZIP rápido)
=================================

Qué incluye
-----------
- `src/lib/s3.js` -> Cliente S3 v3 con REGION y credenciales desde env (AWS_*).
- `src/rutas/uploads.js` -> Router completo con:
  - `GET /api/uploads/list?prefix=uploads/` (listar objetos)
  - `GET /api/uploads/sign-get?key=...` (URL firmada de descarga)
  - Flujo multipart: `POST /multipart/init`, `GET /multipart/sign-part`, `POST /multipart/complete`, `POST /multipart/abort`
- `public/files.html` -> Vista para listar/descargar (usa el endpoint de list).

Cómo instalar (2 pasos)
-----------------------
1) Copia y **reemplaza** estos archivos dentro de tu repo conservando rutas:
   - `src/lib/s3.js`
   - `src/rutas/uploads.js`
   - `public/files.html`

2) Deploy normal en Render. No toques `package.json` (CommonJS).

Probar
------
- Abre `https://TU_SERVICIO.onrender.com/files.html`
- Cambia el prefijo (ej: `uploads/`) y pulsa **Actualizar**.
- Usa los enlaces **Descargar** para generar URL firmada temporal.

Notas
-----
- Requiere env en Render:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (o `S3_REGION`)
  - `S3_BUCKET`

¡Listo!