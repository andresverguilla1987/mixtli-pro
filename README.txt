MIXTLI API — PATCH (validación + errores consistentes)

Qué incluye
-----------
1) src/rutas/users.js  -> Reemplazo completo, usa express-validator y corrige campos.
2) server.inject.js    -> Fragmento listo para pegar al final de tu server.js (404 + error handler + morgan).
3) package.additions.json -> Solo las dependencias que debes agregar a tu package.json.
4) NOTAS.txt           -> Cosas a tener en cuenta.

Pasos rápidos (GitHub)
----------------------
1) Copia y reemplaza el archivo:  src/rutas/users.js
2) Abre tu server.js y pega el CONTENIDO de server.inject.js:
   - Si ya tienes morgan dev y handlers parecidos, no dupliques; deja solo una versión.
3) Abre package.json y AGREGA las dependencias de package.additions.json dentro de "dependencies".
   (No borres lo que ya tengas. Es un merge: agrega express-validator y morgan).
4) Haz commit y push. Render hará el build y tomará las deps nuevas.
5) Prueba en Postman tus endpoints /api/users ... (no cambias nada ahí).

Atajos (si prefieres NPM en local antes del push)
-------------------------------------------------
npm install express-validator morgan

Listo.
