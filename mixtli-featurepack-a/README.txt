Mixtli – FeaturePack A
======================
Este add-on agrega endpoints comunes (mkdir/share/move/trash) SIN tocar tu código actual.
Se montan como un router Express adicional.

1) Copia `routes/mixtli-featurepack-a.js` a tu repo.
2) En `server.js`, después de iniciar `s3`, `bucket` y tener `getSignedUrl`:
   const featurePack = require("./routes/mixtli-featurepack-a")(s3, bucket, getSignedUrl);
   app.use(featurePack);
3) Deploy en Render.

Endpoints
---------
POST /api/mkdir                    { key }
POST /api/share/create             { key, expiresSec, password, maxDownloads }
GET  /api/share/:id
POST /api/share/:id                { password }
GET  /api/share/list
POST /api/share/revoke             { id }
POST /api/move                     { from, to }
DELETE /api/object?key=...        
POST /api/trash/restore            { key }              // usa prefijo trash/
POST /api/trash/empty                                  // stub (200)
POST /api/stats/recalc                                 // stub (200)
POST /api/backup/run                                   // stub (200)

Notas:
- "Compartir" está en MEMORIA (se borra al redeploy). Para persistencia, usar DB/KV.
- Trash/backup/stats están como stubs para no romper pruebas (podemos implementarlos luego).
- `move` usa CopyObject+DeleteObject para evitar fallas de `NoSuchKey` típicas.
