Mixtli — ZIP Corregidor (v2)
============================
Soluciona 404 en: 8–16 y 18–20 (share + ops).

Contenido:
- routes/share.routes.js
- routes/ops.routes.js
- hooks/mount-mixtli-routes.js
- server-mount-snippet.js (bloque que debes pegar en server.js)

Cómo instalar (rápido):
1) Copia **routes/** y **hooks/** al MISMO folder donde vive tu server.js.
   - Si tu server.js está en la raíz => deja routes/ y hooks/ en la raíz.
   - Si tu server.js está en src/ => mueve routes/ y hooks/ dentro de src/.
2) Abre server.js y pega lo de **server-mount-snippet.js** justo ANTES de app.listen(...).
3) Variables de entorno necesarias en Render:
   S3_ENDPOINT, S3_BUCKET, S3_REGION=auto,
   S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
   S3_FORCE_PATH_STYLE=true
   (Opcional) SHARE_SECRET (si no, usa S3_SECRET_ACCESS_KEY).
4) Deploy. Ve a https://TUAPP/__debug/routes y verifica que salen:
   POST /api/share/create, GET /api/share/:id, GET /api/share/list, POST /api/share/revoke,
   POST /api/move, DELETE /api/object, POST /api/trash/restore, POST /api/trash/empty,
   POST /api/stats/recalc, POST /api/backup/run

Listo: ya no deben salir 404 en 8–16 y 18–20.
