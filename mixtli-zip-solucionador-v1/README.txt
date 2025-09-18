ZIP Solucionador — Mixtli (Rutas faltantes)
============================================

Este paquete agrega de golpe todas las rutas que te están dando 404:

- /api/share/*       (8, 9, 10, 11, 12)
- /api/move          (16)
- /api/object        (17)
- /api/trash/*       (18, 19)
- /api/stats/recalc  (14)
- /api/backup/run    (20)

CONTENIDO
---------
routes/
  ├─ share.routes.js
  └─ ops.routes.js
hooks/
  └─ mount-mixtli-routes.js
README.txt

INSTALACIÓN (2 líneas de código)
--------------------------------
1) Copia las carpetas **routes/** y **hooks/** a la raíz de tu backend (junto a server.js).
2) Edita **server.js** y añade ANTES de `app.listen(...)`:

   ```js
   import mountMixtliRoutes from "./hooks/mount-mixtli-routes.js";
   mountMixtliRoutes(app);
   ```

Variables necesarias (Render → Environment)
------------------------------------------
S3_ENDPOINT, S3_BUCKET, S3_REGION=auto,
S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
S3_FORCE_PATH_STYLE=true
Opcional: SHARE_SECRET (si no, se usa S3_SECRET_ACCESS_KEY)
Opcional: DEBUG_ROUTES=true  (para ver /__debug/routes)

Pruebas rápidas (Postman)
-------------------------
- 08 Crear link:       POST /api/share/create
- 09 Resolver:         GET  /api/share/:id
- 11 Listar:           GET  /api/share/list
- 12 Revocar:          POST /api/share/revoke
- 16 Mover:            POST /api/move
- 17 Papelera:         DELETE /api/object?key=postman/hello2.txt
- 18 Restaurar:        POST /api/trash/restore { keys:[...] }
- 19 Vaciar papelera:  POST /api/trash/empty   { prefix:"postman/" }
- 14 Recalc stats:     POST /api/stats/recalc
- 20 Backup run:       POST /api/backup/run  (202 si config; 400 si no)

Nota
----
- El módulo de "share" usa almacenamiento en memoria (suficiente para probar y pasar
  las requests). Si quieres que persista entre reinicios, te preparo versión con índice
  guardado en R2.
