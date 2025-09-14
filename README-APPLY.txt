BACKEND PATCH — /api/upload (fallback) 
=====================================
Añade una ruta para subir archivos vía backend (sin CORS a R2).

1) Copia `routes/upload.js` a tu backend.
2) En `server.js` agrega:
   const uploadRoute = require('./routes/upload');
   app.use('/api', uploadRoute);
3) Instala dependencias:
   npm i multer @aws-sdk/client-s3
4) Variables de entorno: R2_ENDPOINT, R2_BUCKET, R2_KEY, R2_SECRET (igual que /api/presign).
5) Límite actual: 50 MB por archivo (ajústalo en `multer` si ocupas).

Uso: POST /api/upload (form-data) con campo `file`.
Respuesta: { ok: true, key }
