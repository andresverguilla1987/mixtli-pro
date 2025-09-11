# Mixtli — Sitio Profesional (Frontend)
Sitio estático con login/registro (Firebase Auth), subida y previsualización; conecta con tu API en Render.

## Cómo usar
1) Crea un proyecto en Firebase y habilita **Authentication → Email/Password**.
2) Sustituye en `index.html`:
   - `apiKey`, `authDomain`, `projectId`, `appId` por los de tu proyecto.
3) Sube **este folder** (los 2 archivos) a Netlify (o tu hosting estático).
4) Abre el sitio y prueba:
   - **Crear cuenta / Entrar**
   - Subir archivo (usa tu API: `https://mixtli-pro.onrender.com` por defecto o `?api=<tu_api>`).

> Si después quieres que el backend valide el token de Firebase, se añade verificación del Bearer token en el endpoint `/presign`.
