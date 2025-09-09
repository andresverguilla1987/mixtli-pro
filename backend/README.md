# Mixtli Mini Backend (CORS)

Presign PUT a S3/R2, auth mínima con JWT, cleanup TTL, email opcional. CORS habilitado.

## Run
```bash
cp .env.example .env   # completa credenciales
npm i
node server.js
# opcional
node cleanup.js
```

## Deploy
- **Render (Docker)**: sube este folder, usa `render.yaml`.
- **VPS**: `docker build -t mixtli . && docker run -p 10000:10000 --env-file .env mixtli`
