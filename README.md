# Mixtli Project (Mega FULL)
Este pack incluye todo: backend, frontend, postman, despliegue automático y utilidades SQL.

## SQL Helpers en backend/prisma/
- seed.sql → inserta 3 usuarios iniciales (Juan, María, Carlos).
- truncate.sql → elimina todos los usuarios y reinicia IDs.
- reset.sql → limpia y repuebla de una.
- export.sql → exporta todos los usuarios a CSV (psql).
- import.sql → importa usuarios desde CSV (psql).

## Flujo típico
1. Respaldar usuarios actuales → `export.sql`.
2. Limpiar tabla → `truncate.sql` o `reset.sql`.
3. Importar desde CSV si lo necesitas → `import.sql`.

## Deploy
- Render detecta `render.yaml` (backend).
- Netlify detecta `netlify.toml` (frontend).
- Postman colección lista en `postman/`.

Este es el combo final todo en uno 🚀.
