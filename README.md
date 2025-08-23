# Mixtli Pro — WeTransfer-like Uploads

## Endpoints
- `POST /api/files/presign` body: `{ "filename": "ejemplo.pdf", "contentType": "application/pdf", "size": 1234 }`
- `GET /api/files` → lista archivos
- `GET /api/files/:key/download` → link firmado de descarga

## Env
Configura en Render o `.env` local:
```
DATABASE_URL=...
PORT=10000
S3_BUCKET=...
S3_REGION=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=...
S3_FORCE_PATH_STYLE=false
MAX_FILE_MB=2000
LINK_TTL_MIN=15
```

## Deploy (Render)
- **Build Command:** `npm install && npx prisma generate`
- **Pre-Deploy Command:** `npx prisma migrate deploy`
- **Start Command:** `node src/server.js`
