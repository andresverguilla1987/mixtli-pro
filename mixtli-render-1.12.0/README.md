
# Mixtli Mini v1.12.0
Feature pack:
- Auth (JWT HS256). Si `JWT_SECRET` vacío → modo sin auth (uid=anon).
- DB SQLite (`SQLITE_FILE`) con `POST /api/commit` para registrar uploads (size, contentType, sha256).
- Thumbnails: `POST /api/thumbnail { key, width }` → guarda en `thumbs/<key>.jpg`.
- Multipart: `/api/multipart/*` (init, sign, complete, abort).
- Webhooks HMAC: `WEBHOOK_URL` + `WEBHOOK_SECRET`.
- TTL cleanup: `POST /api/admin/expire { days }` (manual o cron).
- Quotas/rate-limit: 300 req/min por IP (ajustable en código).
- Validaciones: `MAX_SIZE_MB`, `ALLOWED_MIME`.

Endpoints clave:
 - Salud: GET /salud, GET /api/health
 - Presign: POST /api/presign  (usa uid del token)
 - Commit:  POST /api/commit   (registra archivo en DB)
 - Read:    GET /api/readlink?key=...&ttl=...
 - Delete:  DELETE /api/file?key=...
 - List S3: GET /api/list?prefix=...&token=...&max=50
 - List DB: GET /api/listdb?uid=...&limit=50&offset=0
 - Thumbs:  POST /api/thumbnail  { key, width }
 - TTL:     POST /api/admin/expire  { days }
 - Multipart: 
     * POST /api/multipart/init { filename, contentType }
     * GET  /api/multipart/sign?key=...&uploadId=...&partNumber=1
     * POST /api/multipart/complete { key, uploadId, parts:[{ETag,PartNumber}] }
     * POST /api/multipart/abort { key, uploadId }

Nota: Para SHA-256 real, calcula en el cliente y envíalo en /api/commit.
