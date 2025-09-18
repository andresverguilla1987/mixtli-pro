Mixtli – INLINE ROUTES (GARANTIZADO)
====================================
Pega el contenido de `INLINE-PASTE-into-server.js.txt` DIRECTO en tu `server.js`
(tras crear `app`, `s3`, `bucket` y `getSignedUrl`). Sin require/imports externos.

Verificación rápida
-------------------
1) Deploy en Render.
2) GET https://mixtli-pro.onrender.com/featurepack/ping  →  { ok:true, pack:"INLINE" }
3) Prueba en Postman:
   - POST /api/mkdir           { "key": "postman/carpeta/" }
   - POST /api/share/create    { "key":"postman/demo-fpa.txt", "expiresSec": 900 }
   - GET  /api/share/:id
   - POST /api/share/:id       { "password": "" }
   - POST /api/move            { "from":"postman/demo-fpa.txt", "to":"postman/demo-fpa-movido.txt" }
   - DELETE /api/object?key=postman/demo-fpa-movido.txt
   - POST /api/trash/restore   { "key":"trash/postman/demo-fpa-movido.txt" }
   - POST /api/trash/empty
   - POST /api/stats/recalc
   - POST /api/backup/run
