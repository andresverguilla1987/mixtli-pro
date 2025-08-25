
# Mixtli – Paquete S3 (drop‑in)

Este paquete **no rompe nada** y solo agrega la subida a S3. Contiene:

```
src/
  services/
    s3.js
  routes/
    upload.js
postman/
  Mixtli_S3.postman_collection.json
```

## 1) Variables de entorno (Render)
Asegúrate de tener **todas** estas variables (ya las tienes, revísalas):

- `S3_REGION` → p.ej. `us-east-1`
- `S3_BUCKET` → nombre del bucket, p.ej. `mixtli-pro-bucket`
- `S3_ACCESS_KEY_ID` → *Access key ID* del usuario IAM
- `S3_SECRET_ACCESS_KEY` → *Secret access key*

> Opcional: `S3_ENDPOINT` si usas un endpoint S3 compatible (para AWS puro, **no** la pongas).

## 2) Copia de archivos
Copia **tal cual** el contenido de `src/` de este zip dentro de tu repo (se respetan las carpetas).
Si ya tienes `src/routes` o `src/services`, simplemente agrega los archivos nuevos.

## 3) Toca una sola línea en tu `server.js`
Abre `server.js` (o el archivo donde montas Express) y **agrega estas 2 líneas**:

```js
// Al inicio, cerca de otros 'require':
const uploadRoutes = require("./src/routes/upload");

// Donde registras rutas (después de CORS, JSON, etc.):
app.use("/api", uploadRoutes);
```

> Si tu estructura usa TypeScript o ESM, adapta los `import` en consecuencia.

## 4) Deploy
- En Render → **Manual Deploy** → **Clear build cache & Deploy**

## 5) Probar con Postman
### A) Subida directa (multipart)
- Método: `POST`
- URL: `https://<tu-app>.onrender.com/api/upload`
- **Body**: `form-data`
  - key: `file` (tipo *File*), selecciona un archivo chico (jpg, png, pdf)
- Respuesta esperada:
```json
{ "url": "https://<bucket>.s3.amazonaws.com/<yyyy/mm/dd/uuid-ext>" }
```

### B) URL prefirmada (para subir desde frontend)
- Método: `GET`
- URL: `https://<tu-app>.onrender.com/api/upload-url?filename=logo.png&contentType=image/png`
- Respuesta:
```json
{ "url": "https://s3.amazonaws.com/...firma...", "key": "yyyy/mm/dd/uuid.png" }
```

## Notas
- Usa **AWS SDK v3** (el código ya está hecho con v3).
- No requiere cambiar `PORT` ni `DATABASE_URL`.
- Los errores se devuelven en JSON con status adecuado.
