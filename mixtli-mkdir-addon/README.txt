Mixtli – Add-on mkdir (crear carpeta)
=====================================

Este paquete agrega la ruta:
  POST /api/mkdir   Body JSON: { "key": "prefijo/que/quieres/" }

Cómo instalar
-------------
1) Copia `routes/mixtli-mkdir-route.js` a tu repo (misma ruta).
2) En tu `server.js`, DESPUÉS de inicializar `s3` y `bucket`, monta la ruta:

   const mkdirRoutes = require("./routes/mixtli-mkdir-route")(s3, bucket);
   app.use(mkdirRoutes);

3) Deploy en Render.
4) Prueba en Postman la petición incluida en la colección de este ZIP.

Notas
-----
- En S3/R2 una carpeta es un PREFIJO. Materializamos el prefijo creando un objeto vacío: `<prefijo>/.keep`.
- Si quieres otro nombre para el placeholder, cambia `placeholder` en el código.
