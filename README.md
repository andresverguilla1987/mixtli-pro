# Mixtli Monorepo (GitHub → Netlify + Render)
Estructura:
- `front/`  (estático, Netlify)
- `backend/` (Node + Docker, Render)
- `netlify.toml` (monorepo: base/publish front)
- `render.yaml`  (Blueprint Render con `rootDir: backend`)

## Deploy
1) Sube este repo a GitHub.
2) **Netlify → New site from Git**: selecciona repo. (Detecta `netlify.toml` y publica `front/`)
3) **Render**:
   - Opción A (Blueprint): New → **Blueprint** → elige repo (usa `render.yaml`).
   - Opción B: New → **Web Service** desde repo y pon **Root Directory = backend**.
4) Configura env vars en Render (R2/S3, CORS, etc.).

## Front
En producción, en la UI guarda **API Base** con la URL de tu backend.
