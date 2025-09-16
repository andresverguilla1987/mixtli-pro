# Mixtli Env Bootstrap

**Objetivo:** evitar el error `ConfigError: S3_BUCKET no está definido` sin modificar tu `server.js`.

## Uso
1) Copia `env-bootstrap.js` al **root** de tu backend (junto a `server.js`).
2) En Render → Settings → **Start Command**, cambia a:
```
node env-bootstrap.js
```
3) Manual Deploy → **Clear build cache & deploy**.

### Qué hace
- Si `S3_BUCKET` está vacío, lo toma de `R2_BUCKET` o `BUCKET`. Si no existen, usa `'mixtli'` como último recurso.
- Normaliza `S3_ENDPOINT` (quita `/<bucket>` si lo tiene).
- Setea `S3_FORCE_PATH_STYLE=true` si faltaba.
- Sanea `ALLOWED_ORIGINS` para que no truene `JSON.parse` accidental.

> Recomendación: define igualmente en Render las variables correctas:
> - `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
> - `S3_BUCKET=mixtli`
> - `S3_REGION=auto`
> - `S3_FORCE_PATH_STYLE=true`
> - `S3_ACCESS_KEY_ID=<key>`
> - `S3_SECRET_ACCESS_KEY=<secret>`
