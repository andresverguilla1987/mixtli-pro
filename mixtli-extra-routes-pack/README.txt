Mixtli EXTRA Routes Pack
========================

Esto agrega endpoints faltantes para que tu colección 8–16 y 18–20 no devuelvan 404.

1) Copia `routes/mixtli-extra-routes.js` a tu repo (por ejemplo a `routes/`).
2) Abre tu `server.js` y **después** de crear tu S3 client y tener `bucket` y `getSignedUrl`:
   ```js
   const extraRoutes = require("./routes/mixtli-extra-routes")(s3, bucket, getSignedUrl);
   app.use(extraRoutes);
   ```
3) Deploy en Render.
4) Usa la colección Postman incluida: `Mixtli-ABS-EXTRA-Routes.postman_collection.json`

Notas importantes
-----------------
- Shares (links públicos) se guardan en memoria (se borran en cada deploy). Para persistirlos,
  muévelos a una base (KV/Redis/DB) si los usarás en producción.
- Trash/papelera es un **stub** usando el prefijo `trash/`. Para vaciarla de verdad hay que
  listar y borrar en lote. Aquí dejamos un 200 de cortesía para tus pruebas.
- `move` ahora hace CopyObject + DeleteObject, lo que corrige el `NoSuchKey` si el `fromKey` existe.
- Si alguno de estos paths ya existe en tu servidor, comenta la ruta duplicada en este add-on.
