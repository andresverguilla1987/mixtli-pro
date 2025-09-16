# Mixtli Backend PRO (v6) — 2025-09-16

**Nuevo:** carpetas (list2), crear carpeta, acciones masivas, multipart upload, ROOT_PREFIX por token, rate limit y auditoría opcional.

## Env
```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=***
S3_SECRET_ACCESS_KEY=***
ALLOWED_ORIGINS=["https://lovely-bienenstitch-6344a1.netlify.app"]
API_TOKEN=<opcional único>           # o usa TOKEN_PREFIX_MAP para varios
TOKEN_PREFIX_MAP={"secretoA":"tenantA/","secretoB":"tenantB/"}
ALLOWED_MIME=image/jpeg,image/png,text/plain,application/pdf
ROOT_PREFIX=postman/                  # opcional (global)
RATE_LIMIT_PER_MIN=120                # opcional
AUDIT=true                            # opcional (log a consola)
```
**Start:** `node server.js`
