# Mixtli Server v3.1

Novedades
- **/api/purge**: borrado definitivo (por `trashKey` o `prefix`)
- **/api/albums?base=public/**: lista álbumes (nombre, conteo, tamaño, portada)
- **/api/album-cover** (POST): guarda `.mixtli-cover.json` con `coverKey`

Se mantiene
- Presign/complete, assets, sign-get, rename
- Público/privado por prefijo, ZIP de álbum, Papelera, Restore
- Multipart uploads

Env recomendada
```
PORT=10000
ALLOWED_ORIGINS=<tu netlify>
R2_BUCKET=mixtli
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<ACCOUNT>.r2.cloudflarestorage.com
R2_PUBLIC_BASE=https://mixtli.<ACCOUNT>.r2.cloudflarestorage.com

PUBLIC_TOGGLE_MODE=prefix
PUBLIC_PREFIX=public/
PRIVATE_PREFIX=_private/
TRASH_PREFIX=_trash/

PRESIGN_EXPIRES=3600
MAX_UPLOAD_MB=50
MULTIPART_PART_SIZE=10485760
ZIP_MAX_KEYS=2000
```
