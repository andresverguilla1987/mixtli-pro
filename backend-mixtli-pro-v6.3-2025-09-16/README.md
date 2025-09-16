# Mixtli Backend PRO (v6.3)

NUEVO: Links públicos con password/expiración, Stats de uso, Backup a segundo bucket, Thumbnails bajo demanda, Slack webhook.

## ENV principales
```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=***
S3_SECRET_ACCESS_KEY=***
ALLOWED_ORIGINS=["https://<tu-netlify>.netlify.app"]

# Auth (elige 1)
API_TOKEN=<opcional>  # o
TOKEN_PREFIX_MAP={"tokenA":"userA/","tokenB":"userB/"}
ROOT_PREFIX=           # opcional

# Papelera/Cache
TRASH_PREFIX=trash/
CACHE_PREFIX=cache/
CACHE_TTL_DAYS=30
LIST_CACHE_TTL_MS=60000

# Thumbs y Slack (opcionales)
ENABLE_THUMBS=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Backup (opcional)
```
BACKUP_ENABLED=true
BACKUP_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
BACKUP_BUCKET=mixtli-backup
BACKUP_REGION=auto
BACKUP_ACCESS_KEY_ID=***
BACKUP_SECRET_ACCESS_KEY=***
```

## Endpoints nuevos
- Shares
  - POST /api/share/create  -> { key, expiresSec=1800, password?, maxDownloads? } -> { id }
  - GET  /api/share/:id?pw=xxx  -> { ok,url,file,expAt,downloads,max }
  - GET  /api/share/list
  - POST /api/share/revoke { id }
- Stats
  - GET  /api/stats           -> { totalBytes, totalObjects, updatedAt } (cache 1h)
  - POST /api/stats/recalc
- Backup
  - POST /api/backup/run { token?, limit? } -> copia a bucket secundario (excluye trash/ y cache/)
- Thumbnails
  - GET  /api/thumb?key=<obj>&w=256  (requiere `npm i sharp`; si no, responde ThumbsDisabled)
