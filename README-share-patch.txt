Mixtli — Patch /api/share (create/resolve/list/revoke)
=========================================================

Este parche agrega endpoints para compartir objetos de R2:

- POST  /api/share/create
- GET   /api/share/:id        (opcional ?pw=...)
- GET   /api/share/list
- POST  /api/share/revoke

El estado se guarda EN MEMORIA (no persiste reinicios). Es suficiente para
probar Postman (items 8–12). Luego podemos persistir en R2/DB si prefieres.


INSTRUCCIONES (Backend: mixtli-pro en Render)
---------------------------------------------
1) Copia **share.routes.js** al mismo directorio que `server.js`.
2) Edita `server.js` y añade estas líneas (ESM):

   ```js
   import createShareRouter from "./share.routes.js";
   import { S3Client } from "@aws-sdk/client-s3";

   const s3 = new S3Client({
     region: process.env.S3_REGION || "auto",
     endpoint: process.env.S3_ENDPOINT,
     forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE).toLowerCase() === "true",
     credentials: {
       accessKeyId: process.env.S3_ACCESS_KEY_ID,
       secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
     },
   });

   const SHARE_SECRET = process.env.SHARE_SECRET || process.env.S3_SECRET_ACCESS_KEY;

   // Monta las rutas de share ANTES de app.listen(...)
   app.use("/api/share", createShareRouter({
     s3,
     bucket: process.env.S3_BUCKET,
     secret: SHARE_SECRET,
   }));
   ```

3) En Render → **Environment**:
   - Asegúrate de tener: S3_ENDPOINT, S3_BUCKET, S3_REGION=auto,
     S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE=true.
   - (Opcional) Agrega `SHARE_SECRET` con cualquier cadena larga aleatoria.

4) Deploy en Render.

5) Prueba en Postman:
   - 08) Crear link público  → OK (devuelve `{ id, key, expiresAt }`)
   - 09) Enlace de resolución (SIN pw) → GET /api/share/:id
   - 10) Enlace de resolución (CON pw) → GET /api/share/:id?pw=...
   - 11) Enlaces listar → GET /api/share/list
   - 12) Enlace revocar  → POST /api/share/revoke  (body: `{ "id": "..." }`)

Notas
-----
- Si tu servicio reinicia, el `list` y contadores se vacían (porque es memoria).
- Seguridad: los IDs son HMAC con `SHARE_SECRET`. No uses este ID para dar
  acceso directo a S3; siempre resolver vía el endpoint que devuelve presignados.
