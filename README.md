# Mixtli Uploader v3 — CSP Safe (2025-09-11)

## Qué cambia
- **Sin JS inline** → no lo bloquea una CSP estricta.
- **Botones de prueba sin JS** (`/api/health`, `/api/presign`) para validar el proxy aun si el JS fallara.
- **Proxy listo** en `netlify.toml`.

## Deploy
1) Sube todos estos archivos a la **raíz** de tu repo conectado a Netlify.
2) Verifica en TU dominio Netlify:
   - `/api/health` → 200 + JSON
   - `/api/presign?filename=ping.txt&contentType=text/plain` → JSON
3) Abre la página y sube un archivo.

> Si tu backend no es `mixtli-pro.onrender.com`, edita la URL en `netlify.toml` y redeploy.
