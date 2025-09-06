# CORS Hotfix (Render + Demo Hosted)

## ¿Qué arregla?
Los errores **Failed to fetch** al llamar tu API desde la página demo (GitHub Pages) por falta de CORS.

## Archivos
- `server.js` (root con CORS) — úsalo si tienes root server.
- `notifications/server.js` (con CORS) — si corres el módulo directamente.
- `package.json` (root) — añade dependencia `cors`.

## Aplicación express
1) Sube estos archivos a tu repo:
   - Si usas root server: reemplaza `server.js` y `package.json` en la **raíz**.
   - Si no: reemplaza `notifications/server.js` dentro del módulo.
2) `git add . && git commit -m "hotfix: enable CORS" && git push`
3) En Render, **Redeploy**.
4) Prueba:
   - `https://mixtli-pro.onrender.com/` debe responder JSON.
   - La página demo ya no mostrará *Failed to fetch*.

## Notas
- CORS se configura con `origin: true` (refleja el origen; sirve para Pages).
- Si quieres restringir, cambia a `origin: ['https://<tu-usuario>.github.io']`.
