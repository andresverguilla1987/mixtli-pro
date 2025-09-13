
Mixtli PRO — Fix 'unsupported_type' (Render)
============================================

Este paquete reemplaza el servidor para aceptar .JPG/.JPEG en mayúsculas y
otros tipos válidos. Normaliza extensión y MIME, y "olfatea" el tipo cuando
el navegador manda `application/octet-stream`.

Cómo usar (Render + GitHub)
---------------------------
1) Crea un repo nuevo en GitHub y sube estos archivos (o reemplaza tu server actual).
2) En Render, crea/actualiza el servicio conectando a ese repo.
3) Comandos en Render:
   - Build:       npm install --no-audit --no-fund
   - Start:       node server.js
   - (opcional) Pre-deploy:  npx prisma db push --skip-generate
4) Variables de entorno en Render:
   - R2_ACCOUNT_ID
   - R2_ACCESS_KEY_ID
   - R2_SECRET_ACCESS_KEY
   - R2_BUCKET
   - PUBLIC_BASE_URL   (p.ej. https://pub-xxxxxxxxxxxx.r2.dev)
   - ALLOWED_ORIGINS   (p.ej. https://lovely-bienenstitch-6344a1.netlify.app)
   - R2_ENDPOINT       (opcional, si no usas el default)
   - R2_REGION         (opcional, default 'auto')

Endpoints
---------
- GET  /api/health     → { ok:true, mode:'server-upload' }
- POST /api/upload     → sube archivo (form field: file, optional folder)
- GET  /api/list       → lista objetos: ?prefix=&limit=100
- GET  /api/signget    → URL firmada temporal: ?key=...

Pruebas rápidas
---------------
curl -s https://TU-RENDER.onrender.com/api/health
curl -s -F file=@./foto.JPG -F folder=users/123 https://TU-RENDER.onrender.com/api/upload
curl -s "https://TU-RENDER.onrender.com/api/list?prefix=users/123/&limit=20"
curl -s "https://TU-RENDER.onrender.com/api/signget?key=users/123/123-foto.JPG"
