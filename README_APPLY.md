
# Mixtli — Fix para `/api/presign` (400) y `/api/list` (500)

Este paquete NO reemplaza todo tu proyecto; trae **snippets** y un **diff** mínimos.
Úsalos para ajustar tu `server.js` y (si hace falta) el front de Netlify.

---

## 1) Variables de entorno (Render)

Asegúrate de tener esto (ajústalo a tu proveedor):

### Si usas Cloudflare R2
- `S3_PROVIDER=r2`
- `S3_BUCKET=mixtli-pro-bucket`  (o el que uses)
- `S3_REGION=auto`
- `S3_ENDPOINT=https://<TU_ACCOUNT_ID>.r2.cloudflarestorage.com`
- `S3_ACCESS_KEY_ID=<tu_access_key>`
- `S3_SECRET_ACCESS_KEY=<tu_secret_key>`
- `S3_FORCE_PATH_STYLE=true`
- `ALLOWED_ORIGINS=["https://lovely-bienenstitch-6344a1.netlify.app","https://meek-alfajores-1c364d.netlify.app"]`

### Si usas AWS S3
- `S3_PROVIDER=aws`
- `S3_BUCKET=<tu-bucket>`
- `S3_REGION=<us-east-1 | us-west-2 | ...>`
- (Opcional) `S3_ENDPOINT=` (dejar vacío)
- `S3_ACCESS_KEY_ID=<tu_access_key>`
- `S3_SECRET_ACCESS_KEY=<tu_secret_key>`
- `S3_FORCE_PATH_STYLE=false` (o no la declares)
- `ALLOWED_ORIGINS=["https://lovely-bienenstitch-6344a1.netlify.app","https://meek-alfajores-1c364d.netlify.app"]`

> **Importante**: ALLOWED_ORIGINS en formato **JSON** (corchetes y comillas).

---

## 2) Back-end — normaliza el body de `/api/presign`

En tu `server.js`, reemplaza el handler de **/api/presign** por el snippet de `snippets/server-presign-snippet.js`.
Acepta tanto `contentType` como `type` y `size` o `contentLength`.

También agrega el `try/catch` y el log para que si pasa algo ver el detalle.

---

## 3) Back-end — `/api/list` robusto

En `server.js`, usa el snippet `snippets/server-list-snippet.js` para envolver el `listAll(...)` en try/catch,
y loguear el error real. Si falla por permisos/credenciales, verás el detalle en los logs.

> Si usas R2, el token debe tener permisos **ListObjects**, **GetObject**, **PutObject** para el bucket.

---

## 4) Front-end — asegura `contentType`

Si tu front (Netlify) aún envía `{ type: file.type }`, cambia a:

```js
body: JSON.stringify({
  key,               // ruta/clave donde se sube
  contentType: file.type,
  size: file.size
})
```

En este paquete hay un ejemplo en `snippets/frontend-presign-example.js`.

---

## 5) Diff mínimo

Si prefieres aplicar por diff, mira `patch/patch-presign-list.diff` para ubicar exactamente qué cambiar.

---

## 6) Checklist rápido

- [ ] Variables de entorno bien escritas (especialmente ALLOWED_ORIGINS como JSON).
- [ ] `/api/presign` acepta `contentType OR type` y `size OR contentLength`.
- [ ] Token/credenciales S3/R2 con permisos de **listar**, **leer** y **escribir**.
- [ ] Front envía `contentType` y `size`.
- [ ] Redeploy en Render.
