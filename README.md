# Mixtli — Front (Netlify) FIX ZIP

Soluciona:
1) Publicación desde `/front` (via `netlify.toml`).
2) Uploader con PUT presignado sin `no-cors` ni `Authorization`.

## Pasos
1. Edita `assets/config.js` y pon tu API base (https):
   ```js
   export const API_BASE = "https://mixtli-pro.onrender.com";
   ```
2. Sube a GitHub y conecta a Netlify **o** sube el ZIP.  
3. Aplica en **Cloudflare R2** una sola CORS Policy (ver `r2_cors.json`).  
4. Prueba subir un archivo desde el sitio Netlify.

Endpoints intentados por el front:  
- `POST {API_BASE}/upload/presign`  
- `POST {API_BASE}/presign`  

Respuestas soportadas: `{url}` o `{uploadUrl}` o `{presignedUrl}`.
