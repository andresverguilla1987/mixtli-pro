# Mixtli — Design Lock v1 (clean, presign automático)

Versión **limpia** (sin debug) de la UI estable con flujo de presign automático. API base fija en:
`https://mixtli-pro.onrender.com`

## Flujo
1. Usuario elige/arrastra archivo.
2. Frontend pide presign a `/api/presign` (GET y si falla, POST).
3. PUT a R2 con barra de progreso.
4. Muestra `publicUrl` (preview si es imagen).

## Deploy
- Subir carpeta/repo a Netlify, GitHub Pages o cualquier host estático.
