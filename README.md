# Mixtli — ZIP todo-en-uno (R2 presign, menos pedos)

## Qué hace
- **Backend (Render)**: /presign genera URL de subida a R2 (PUT) y, si configuras `PUBLIC_BASE_URL`, te regresa un **link público directo** listo para compartir (recomendado).
- **Frontend (Netlify)**: index.html que sube archivo y muestra el enlace resultante.
- **CORS**: habilitado para `http://localhost:5173` y `https://*.netlify.app` por defecto.

## Despliegue

### 1) Backend en Render
1. Crea un servicio Web en Render apuntando a `/backend`.
2. Variables de entorno (Render → Environment):
   - `R2_ACCESS_KEY_ID` = TU_KEY
   - `R2_SECRET_ACCESS_KEY` = TU_SECRET
   - `R2_BUCKET` = Nombre del bucket
   - `R2_ACCOUNT_ID` = Tu Account ID de Cloudflare
   - `PUBLIC_BASE_URL` = **Recomendado:** `https://pub-XXXX.r2.dev/MI_BUCKET`
   - (opcional) `ALLOWED_ORIGINS` = `http://localhost:5173,https://*.netlify.app`
3. Deploy. Verifica `/health`.

### 2) CORS en Cloudflare R2 (bucket)
Pon una sola policy, p.ej.:
```json
[{
  "AllowedOrigins": ["https://TU-SITIO.netlify.app","http://localhost:5173"],
  "AllowedMethods": ["PUT","GET","HEAD"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag","Location","x-amz-request-id"],
  "MaxAgeSeconds": 300
}]
```

### 3) Frontend en Netlify
1. Sube la carpeta `frontend/` como **Deploy manual** ó conecta un repo.
2. Abre tu sitio Netlify. Si tu API no es `https://mixtli-pro.onrender.com`, agrega `?api=TU_API` a la URL.

## Cómo usar
1. Abre tu sitio Netlify.
2. Selecciona archivo → “Subir y generar enlace”.  
3. Si configuraste `PUBLIC_BASE_URL`, verás un link público inmediato. Si no, puedes usar `/download/:key` del backend como proxy.

## Notas
- Ruta fija: **/presign**.
- Expiración de presign: 1h (ajusta `PRESIGN_EXPIRES`).