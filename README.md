Mixtli R2 Hotfix (front + backend)

1) Render (backend):
   - Start: node server.js
   - Build: :
   - Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, PORT=10000
   - Salud: GET /salud

2) Netlify (front):
   - publish = "front" (netlify.toml)
   - build command vacío
   - En la UI, pon API Base = https://<tu-servicio>.onrender.com

3) Cloudflare R2 (CORS):
   - Pega r2-cors.json en Settings > CORS Policy de tu bucket (ajusta tu dominio si quieres)

4) Prueba:
   - Subir archivo → verás share URL (GET presign) en el log.
