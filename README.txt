Mixtli fix: ALLOWED_ORIGINS + S3/R2
===================================

Qué corrige
-----------
- Error al parsear ALLOWED_ORIGINS cuando no estaba en JSON válido.
- Error de AWS SDK: "Resolved credential object is not valid" debido a credenciales ausentes o mal leídas.
- Compatibilidad con Cloudflare R2 (path-style=true) y AWS S3 (path-style=false).

Archivos
--------
- utils/s3.js
- src-snippets/server.allowed-origins.snippet.js
- patches/allowed-origins-and-s3.patch
- env/.env.example.append

Cómo aplicar
------------
1) Sustituye `utils/s3.js` por el de este ZIP.
2) Abre tu `server.js` y usa el contenido de `src-snippets/server.allowed-origins.snippet.js`
   para definir `ALLOWED_ORIGINS` y el callback de CORS.
3) En Render → **Environment**, pega lo de `env/.env.example.append` y ajusta valores reales.
4) Redeploy.

Notas
-----
- Para R2: `S3_FORCE_PATH_STYLE=true` y `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`
- Para AWS S3: `S3_FORCE_PATH_STYLE=false` y no pongas endpoint (o el de S3 nativo).

Generado: 2025-09-15T03:20:59.668287Z
