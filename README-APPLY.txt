Mixtli v1.11.0 — BACKEND DELTA (drop-in)
=======================================

Este paquete añade endpoints y utilidades para:
- Búsqueda /api/search
- Operaciones masivas /api/files/bulk
- Edición rápida /api/files/rename y /api/files/transform (rotar)
- Utilidad S3 (R2) utils/s3.js
- Fragmento de package.json con dependencias necesarias

Compatibilidad:
- Si usas Prisma + Postgres con tabla `File` (id, name, mimeType, size, key, albumId, createdAt, updatedAt, thumbnailUrl, url), las rutas usan Prisma si `USE_PRISMA=true`.
- Si NO, pueden funcionar con `USE_PRISMA=false` usando listado S3 (R2). La búsqueda será básica y menos eficiente.

Pasos de integración:
---------------------
1) Copia `routes/` y `utils/` al backend.
2) En `server.js` agrega:
   const searchRoute = require('./routes/search');
   const bulkRoute = require('./routes/bulk');
   const filesOpsRoute = require('./routes/filesOps');
   app.use('/api', searchRoute);
   app.use('/api', bulkRoute);
   app.use('/api', filesOpsRoute);

3) Instala dependencias nuevas:
   npm i sharp @aws-sdk/client-s3
   (si usas Prisma: npm i @prisma/client)

4) Variables de entorno requeridas (Render):
   R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
   R2_BUCKET=mixtli
   R2_KEY=...
   R2_SECRET=...
   USE_PRISMA=true|false

5) Verifica CORS (ALLOWED_ORIGINS) para tu dominio de Netlify activo.

Notas:
- /api/files/transform usa Sharp para rotación; sólo para imágenes.
- /api/files/bulk 'copy' reutiliza el mismo key; si quieres duplicar bytes, implementa una copia a un nuevo Key dentro de bulk.js.
