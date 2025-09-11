# Mixtli Frontend (Fix Kit)

Este frontend SIEMPRE llama a `/api/*` relativo al dominio (no hay selector de API). Netlify lo proxeará a tu backend.

## Pasos
1) Pon estos archivos en la RAÍZ del repo (junto a `index.html`).
2) Netlify → Import from Git → Build command vacío, Publish `.` → Deploy.
3) Verifica en tu dominio Netlify:
   - `/api/health` → 200 con JSON.
   - `/api/presign?filename=ping.txt&contentType=text/plain` → JSON de presign.
4) Abre la página, sube un archivo → debe dar “Subida completa ✓” y `publicUrl`.

Si tu backend NO es `https://mixtli-pro.onrender.com`, cambia esa URL en `netlify.toml` y redeploy.
