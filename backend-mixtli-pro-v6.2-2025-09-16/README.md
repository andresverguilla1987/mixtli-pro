# Mixtli Backend PRO (v6.2) — 2025-09-16

### Qué cambia
- **Papelera**: DELETE mueve a `TRASH_PREFIX/` (hard delete con `?hard=1` o si ya está en papelera).
- **Restore / Vaciar**: `/api/trash/restore`, `/api/trash/empty`.
- **Cleanup**: `/api/cleanup` borra `CACHE_PREFIX` más viejo que `CACHE_TTL_DAYS` (no toca archivos del usuario).
- **Cache de /api/list2** con TTL (`LIST_CACHE_TTL_MS`) e invalidación automática al mutar.

### ENV (Render)
```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=***
S3_SECRET_ACCESS_KEY=***
ALLOWED_ORIGINS=["https://<tu-netlify>.netlify.app"]

# Auth
API_TOKEN=<opcional>  # o
TOKEN_PREFIX_MAP={"tokenA":"userA/","tokenB":"userB/"}  # ROOT por token

# Opcionales v6.2
TRASH_PREFIX=trash/
CACHE_PREFIX=cache/
CACHE_TTL_DAYS=30
LIST_CACHE_TTL_MS=60000
AUDIT=true
```
