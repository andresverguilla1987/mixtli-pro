# Mixtli — Frontend sin login (No-Auth)
Versión simplificada y profesional del sitio: **sin modal de autenticación**. Subir → presign → PUT → link público.

## Cómo usar
1) **Sírvelo por HTTP** (no `file://`):
   ```bash
   npx http-server -p 8080
   # o
   python -m http.server 8080
   ```
   Abre `http://127.0.0.1:8080/`
   (o súbelo a Netlify).
2) **API**
   - Por defecto apunta a `https://mixtli-pro.onrender.com`.
   - Puedes cambiarla con el botón “Cambiar API” (guarda en localStorage) o con `?api=https://tu-api.com`.

## Nota CORS
Desde `file://` el navegador manda `Origin: null` y tu backend (por seguridad) no lo permite. Por eso **usa http/https** para evitar CORS.
