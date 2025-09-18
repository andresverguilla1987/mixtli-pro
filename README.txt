Mixtli – INLINE DIAG & SAFE
===========================
Pega `INLINE-DIAG-PASTE-into-server.js.txt` en tu server.js **después de crear `app`**.
Se auto-resuelve `s3`/`bucket` desde variables de entorno si tus variables se llaman distinto.

Diagnóstico útil:
- GET /featurepack/ping   → { ok:true, pack:"INLINE-DIAG" }
- GET /__env              → muestra S3_ENDPOINT, S3_BUCKET, etc.
- GET /__routes           → lista rutas registradas

Rutas incluidas (funcionales):
POST /api/mkdir
POST /api/share/create
GET  /api/share/:id
POST /api/share/:id
POST /api/move
DELETE /api/object
POST /api/trash/restore
POST /api/trash/empty (stub)
POST /api/stats/recalc (stub)
POST /api/backup/run (stub)
