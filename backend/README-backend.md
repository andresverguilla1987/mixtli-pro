# Mixtli Backend (Express + CORS + R2 presign)

## Desplegar (Render / Railway)
1. `npm install`
2. `node server.js` (local) — prueba: `http://localhost:10000/api/health`
3. En Render: New → Web Service → repo `backend`
   - **Start Command**: `node server.js`
   - **Environment**: Node 18+
   - **ENV VARS** (copiar `.env.example`)
4. Agrega tu dominio Netlify a `ALLOWED_ORIGINS` (si NO usarás el proxy).

## Endpoints
- `GET /api/health`
- `GET /api/presign?filename=...&contentType=...`
- `POST /api/presign` (JSON: `{ filename, contentType }`)
