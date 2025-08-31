# Snippet para server.js / app.js

Este archivo (`server-snippet.js`) contiene utilidades para ayudarte a descubrir tus rutas reales y tener un health check:

1. Endpoints de salud en `/health`, `/api/health`, `/api/v1/health`.
2. Endpoint de introspección en `/__routes` que lista todas las rutas que Express tiene registradas.
3. Middleware al final que loguea los 404 y responde con un JSON útil.

## Uso

- Copia y pega el contenido de `server-snippet.js` dentro de tu `server.js` o `app.js` **después de crear `app`** y antes de `app.listen(...)`.
- Redeploya tu servicio en Render.
- Visita en el navegador:
  - `https://<tu-app>.onrender.com/health`
  - `https://<tu-app>.onrender.com/api/health`
  - `https://<tu-app>.onrender.com/api/v1/health`
  - `https://<tu-app>.onrender.com/__routes`

Con `__routes` obtendrás un JSON con todas las rutas reales. Usa eso para ajustar Postman.
