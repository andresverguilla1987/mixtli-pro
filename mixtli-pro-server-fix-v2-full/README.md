
Mixtli PRO — Fix v2 (Render)
=============================

Cambios:
- Acepta `.JPG` (mayúsculas) y `image/jpg`.
- Si llega como `application/octet-stream`, detecta MIME real (file-type).
- Bandera `SKIP_TYPE_CHECK=1` para omitir validación temporalmente.
- `/api/health` devuelve `{ version: "fix-v2", skipTypeCheck: <bool> }`.
- Endpoint de depuración `/api/debug/upload` (no sube, solo responde con `ext`, `mimetype`, `sniff`).

Despliegue en Render
--------------------
1) Sube este repo a GitHub y conéctalo en Render (Web Service).
2) Comandos:
   - Build: `npm install --no-audit --no-fund`
   - Start: `node server.js`
3) Variables de entorno:
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
   - `PUBLIC_BASE_URL` (p.ej. https://pub-xxxxx.r2.dev)
   - `ALLOWED_ORIGINS` (p.ej. https://lovely-bienenstitch-6344a1.netlify.app)
   - Opcional: `R2_ENDPOINT`, `R2_REGION=auto`
   - **Opcional**: `SKIP_TYPE_CHECK=1` (mientras pruebas)

Pruebas
-------
- Health: `GET /api/health`
- Debug:  `POST /api/debug/upload` con `file=@...` → devuelve `ext/mimetype/sniff`
- Upload: `POST /api/upload` con `file=@...` y opcional `folder=...`
