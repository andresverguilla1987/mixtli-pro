
# Mixtli Mini v1.11.0
Incluye:
1) DELETE /api/file?key=...
2) GET /api/list?prefix=...&token=...&max=50
3) Validación server-side de Content-Type (whitelist) y tamaño (máximo para presign)
4) Claves con prefijo users/{uid}/YYYY/MM/DD/
5) /api/readlink con TTL configurable (hasta 24h)

Env útiles:
- MAX_SIZE_MB (default 50)
- ALLOWED_MIME (csv)
