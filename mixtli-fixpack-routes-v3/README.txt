Mixtli — FixPack Rutas v3
==========================

Qué arregla
-----------
- Habilita las rutas que te daban 404:
  8–12 (/api/share/*), 14 (/api/stats/recalc), 16 (/api/move),
  17 (/api/object DELETE), 18–19 (/api/trash/*), 20 (/api/backup/run).
- Incluye un hook y snippets listos para montar sin adivinar.

Contenido
---------
- routes/share.routes.js
- routes/ops.routes.js
- hooks/mount-mixtli-routes.js
- snippets/server-root-snippet.js   (para server.js en la raíz)
- snippets/server-src-snippet.js    (para server.js en src/)
- README (este archivo)

Cómo instalar (sin cagarla)
---------------------------
1) Copia **routes/** y **hooks/** al MISMO nivel de tu `server.js`.
   - Si tu `server.js` está en la raíz => deja `routes/` y `hooks/` en la raíz.
   - Si tu `server.js` está en `src/` => mueve `routes/` y `hooks/` dentro de `src/`.

2) Abre `server.js` y **ANTES de `app.listen(...)`** pega el snippet que te toque:
   - Raíz:   mira `snippets/server-root-snippet.js`
   - En src: mira `snippets/server-src-snippet.js`

3) Variables de entorno en Render (Settings → Environment):
   S3_ENDPOINT
   S3_BUCKET
   S3_REGION=auto
   S3_ACCESS_KEY_ID
   S3_SECRET_ACCESS_KEY
   S3_FORCE_PATH_STYLE=true
   (Opcional) SHARE_SECRET

4) Redeploy. Verifica rutas:
   https://TU-APP.onrender.com/__debug/routes

   Debes ver, entre otras:
   POST /api/share/create
   GET  /api/share/:id
   GET  /api/share/list
   POST /api/share/revoke
   POST /api/move
   DELETE /api/object
   POST /api/trash/restore
   POST /api/trash/empty
   POST /api/stats/recalc
   POST /api/backup/run

Notas
-----
- Si `POST /api/move` te devuelve `NoSuchKey`, primero sube algo al `from`
  (usa tu endpoint de presign PUT + PUT al URL firmado) y luego vuelve a probar.
