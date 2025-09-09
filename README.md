# Mixtli — Mega Pack (Design Lock v1 + Backend Mini)

Todo listo para:
1) Conectar UI (Design Lock v1) al backend mini (R2/S3).
2) Probar flujo completo: Entrar → Presign → PUT → Complete → Link → Email.
3) Subir a Netlify (front) y Render/VPS (backend).

## Carpetas
- `/front` — Interfaz fija (v1) ya conectada a API.
- `/backend` — Mini backend con CORS, presign R2/S3, cleanup, Dockerfile.
- `/postman` — Colección para pruebas rápidas.
- `/bucket-cors` — Ejemplos de CORS para el bucket.

## Quickstart
### Backend
```bash
cd backend
cp .env.example .env   # completa credenciales (R2 o S3) y CORS_ORIGINS
npm i
node server.js
# opcional limpieza
node cleanup.js
```
Health: `GET /api/health` (debe mostrar `driver: R2` o `S3`).

### Frontend
- Opción rápida: abre `front/index.html` y configura **API Base**; ideal servir estático (Netlify).
- `front/netlify.toml` listo para publicar.

### Bucket CORS
- Configura CORS en tu bucket (ver `/bucket-cors`). Sin esto, el **PUT** desde navegador será bloqueado.

## Deploy
- **Netlify**: sube `/front` como sitio estático.
- **Render (Docker)** o **VPS**: usa `/backend` (Dockerfile + render.yaml listos).

> Design Lock v1: esta apariencia no se cambia sin tu autorización.
