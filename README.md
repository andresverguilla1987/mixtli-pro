# Mixtli Backend FINAL (2025-09-16)

**Qué es**  
`server.js` listo con:
- Presign **PUT/GET** (`/api/presign`)
- List (`/api/list`)
- Delete (`/api/object?key=...`)
- Salud (`/salud`) y `_envcheck`

**Dependencias necesarias**
```
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner express
```

**Variables en Render**
```
S3_ENDPOINT=https://8351c372dedf0e354a3196aff085f0ae.r2.cloudflarestorage.com
S3_BUCKET=mixtli
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
ALLOWED_ORIGINS=["https://tu-netlify.app"]
```

**Deploy**
1) Reemplaza tu `server.js` por el de este zip (raíz del repo `mixtli-pro`).  
2) Haz commit y push a GitHub.  
3) En Render: Manual Deploy → **Clear build cache & deploy**.  
4) Verifica: `https://mixtli-pro.onrender.com/_envcheck` y `.../salud`.
