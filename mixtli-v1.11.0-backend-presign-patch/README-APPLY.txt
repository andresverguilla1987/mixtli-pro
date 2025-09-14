Mixtli v1.11.0 — BACKEND PATCH: /api/presign
============================================

Este parche agrega el endpoint **POST /api/presign** para obtener un URL presignado (PUT) hacia Cloudflare R2 (S3-compatible).

Requisitos de entorno (Render):
- R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
- R2_BUCKET=mixtli
- R2_KEY=...
- R2_SECRET=...
- PUBLIC_BASE_URL=https://lovely-bienenstitch-6344a1.netlify.app   (opcional, para formshared)
- ALLOWED_ORIGINS debe incluir tu dominio Netlify actual

Instalación:
1) Copia `routes/presign.js` a tu backend y en `server.js` agrega:
   const presignRoute = require('./routes/presign');
   app.use('/api', presignRoute);

2) Instala dependencia:
   npm i @aws-sdk/s3-request-presigner

3) Verifica health:
   GET https://mixtli-pro.onrender.com/api/health  -> { ok: true }

4) Probar presign:
   POST https://mixtli-pro.onrender.com/api/presign
   Body JSON: { "name":"test.jpg", "type":"image/jpeg", "size":12345 }
   Respuesta: { "key":"uploads/2025/09/14/...", "url":"https://.../mixtli/...","headers": { "Content-Type":"image/jpeg" } }

Notas:
- La firma incluye `ContentType` para que el PUT lo envíe con ese header.
- Si quieres guardar el registro en DB, hazlo en el handler tras generar `key` (opcional).
