Mixtli – FeaturePack A (FIX)
============================
Este paquete corrige los 404 añadiendo las rutas faltantes y un endpoint de verificación: **GET /featurepack/ping**.

Cómo instalar (GitHub → Render)
--------------------------------
1) Copia `routes/mixtli-featurepack-a.js` a tu repo.
2) Abre `server.js` y monta el router DESPUÉS de crear tu S3 client y `bucket`:
   - CommonJS:
       const featurePack = require("./routes/mixtli-featurepack-a")(s3, bucket, getSignedUrl);
       app.use(featurePack);
   - ESM:
       import featurePackFactory from "./routes/mixtli-featurepack-a.js";
       const featurePack = featurePackFactory(s3, bucket, getSignedUrl);
       app.use(featurePack);
3) Deploy en Render.
4) Verifica: GET https://mixtli-pro.onrender.com/featurepack/ping  →  200 { ok:true, pack:"A-FIX" }

Colección Postman incluida
--------------------------
Importa `Mixtli-FeaturePack-A-FIX.postman_collection.json` y ejecútala en orden.
