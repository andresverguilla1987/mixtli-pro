Mixtli — Fix presign 400 + ALLOWED_ORIGINS parsing + /api/health
================================================================

Contenido del ZIP:
------------------
1) utils/s3.js
   • Cliente S3/R2 unificado (AWS SDK v3).
   • Soporta S3_FORCE_PATH_STYLE=true (R2) o false (AWS S3).
   • Función presignPut para PUT (upload) y listAll para /api/list.
   • Validación de credenciales con errores claros.

2) server-snippets/presign-route.js
   • Ruta /api/presign tolerante con claves: acepta { key } ó { filename }, 
     y { contentType } ó { type }.
   • Responde 200 con url firmada; 400 con mensaje claro si falta el 'key'.
   • Añade /api/health (200) para checks simples.

3) server-snippets/allowed-origins.js
   • Helper para parsear ALLOWED_ORIGINS desde:
     - JSON: ["https://a","https://b"]
     - CSV:  https://a,https://b
     - String única: https://a
   • Evita el error "is not valid JSON" si pones CSV.

4) env/.env.example.append
   • Pega estos envs en Render → Environment (y ajusta valores).


DÓNDE PEGAR:
------------
A) Reemplaza tu archivo: utils/s3.js
   Ruta en repo: utils/s3.js

B) Copia e integra el snippet de la ruta POST /api/presign
   - Abre tu server.js y localiza la ruta /api/presign actual.
   - Sustitúyela por el contenido de server-snippets/presign-route.js.
   - Si no tienes /api/health, añade también ese endpoint del snippet.

C) Integra el helper de ALLOWED_ORIGINS
   - Copia el contenido de server-snippets/allowed-origins.js
   - Úsalo en tu server.js para convertir process.env.ALLOWED_ORIGINS a Array
     (ver comentario dentro del snippet).

D) Variables de entorno (Render → Environment)
   Copia lo de env/.env.example.append y ajusta según uses AWS S3 o Cloudflare R2.

E) Redeploy en Render.


Notas clave (para tus logs):
----------------------------
• Si ves "POST /api/presign 400":
  - El body debe tener 'key' O 'filename'. 
  - Debe incluir 'contentType' O 'type'. Si falta, por default usa 'application/octet-stream'.

• Si ves "Resolved credential object is not valid":
  - Falta o es incorrecta la combinación de AccessKey/Secret/Region/Endpoint.
  - Revisa S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (o AWS_*), S3_REGION, S3_BUCKET.
  - En R2, agrega S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com y S3_FORCE_PATH_STYLE=true.

• /files/... 302 es normal: es redirección a URL firmada de lectura.


Ejemplo de ALLOWED_ORIGINS (JSON recomendable):
-----------------------------------------------
ALLOWED_ORIGINS=["https://lovely-bienenstitch-6344a1.netlify.app","https://meek-alfajores-1c364d.netlify.app","http://localhost:5173"]

Si prefieres CSV:
ALLOWED_ORIGINS=https://lovely-bienenstitch-6344a1.netlify.app,https://meek-alfajores-1c364d.netlify.app,http://localhost:5173


Fecha del paquete: 2025-09-15T03:29:19.739680Z