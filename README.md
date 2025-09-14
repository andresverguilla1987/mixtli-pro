# Mixtli — Full Backend (Render-ready)
(esta versión corrige el import de `randomUUID` usando `crypto.randomUUID`)

## Endpoints
- `GET /api/list?limit=160&prefix=public/`
- `POST /api/presign` → `{ filename, type, size, album }`
- `POST /api/complete`
- `GET /files/<path>` (binario)
- `GET /api/raw?key=...` (binario)
- `GET /api/get?key=...` → `{ url }`

## Deploy
Build: `npm install`  
Start: `npm start`  
Variables: ver `.env.example`.
