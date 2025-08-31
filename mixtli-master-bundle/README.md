# Mixtli Master Bundle

Todo junto para desplegar de un solo madrazo, pero con orden. Dentro tienes:

1) `01-backend-clean/mixtli-pro-clean.zip`
   - API limpia (Express + Prisma) con CRUD de usuarios y `/salud`.
   - Colección Postman incluida.
   - Ideal si solo quieres arreglar lo actual rápido.

2) `02-backend-clean-render/mixtli-pro-clean-with-render.zip`
   - Mismo backend limpio + `render.yaml`.
   - Para levantar el servicio vía Blueprints.

3) `03-backend-clean-render-variants/mixtli-pro-clean-with-render-variants.zip`
   - Incluye `render-starter.yaml` (plan starter, `autoDeploy: false`).

4) `04-backend-multiservice/mixtli-pro-multiservice.zip`
   - Web + Worker (BullMQ/Redis) + subidas **multipart S3**.
   - `render-multi.yaml` para crear ambos servicios en Render.
   - Postman de flujo multipart.

5) `05-frontend-uploader/mixtli-uploader-frontend.zip`
   - Front estático con **Uppy** (Dashboard + AwsS3Multipart).
   - Conéctalo al backend: pon tu `Base URL` y sube a toda máquina.

## Ruta recomendada (cero sustos)
- Staging: despliega **04-backend-multiservice** con `render-multi.yaml`.
- Configura `.env`/Env Vars en Render:
  - `DATABASE_URL`, `REDIS_URL`
  - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=true`
  - `PORT=10000`, `NODE_ENV=production`, `JWT_SECRET`
- Prueba con Postman (`Mixtli-Uploads.postman_collection.json`).
- Frontend: sube **05-frontend-uploader** a Netlify/Render Static y apunta al backend de staging.
- Cuando jale chingón → promueve a producción (apuntar dominio).

## Nota de seguridad
- `passwordHash` jamás se expone en respuestas.
- Usa HTTPS en backend y bucket/CDN.
- Ajusta CORS al dominio de tu front al pasar a producción.
