# Mixtli Postman PRO

Todo listo para correr en **Local** o **Staging** con un click.

## Importar
1. Importa **Mixtli-PRO.postman_collection.json** (colección).
2. Importa **Mixtli-Local.postman_environment.json** y/o **Mixtli-Staging.postman_environment.json**.
3. Selecciona el environment (arriba a la derecha en Postman).

## Flujo sugerido
### Health
- `GET /salud` → debe regresar `200` y `{ ok: true }`.

### Users
1. **POST /api/users (crear)** → test guarda `userId` automáticamente.
2. **GET /api/users/:id** → usa `{{userId}}` guardado.
3. **PUT /api/users/:id** → actualiza email.
4. **DELETE /api/users/:id** → borra el usuario.

### Uploads (multipart)
1. **POST init** → guarda `{{uploadId}}` y `{{key}}` en environment.
2. **GET sign-part** → devuelve `url` firmada (para subir la parte desde cliente).
3. **POST complete** → envía `{ ETag, PartNumber }` obtenidos del storage.
4. **POST abort** → cancela subida en curso.

> Nota: `POST complete` requiere `ETag` real (lo da el bucket tras subir la parte). Para pruebas rápidas, puedes dejarlo pendiente o probarlo ya con el frontend Uppy.

## Tips
- Cambia `baseUrl` en el environment (Local ↔ Staging).
- El prerequest de creación de usuario autogenera email si no das uno.
- Si guardas `userId`/`uploadId` y salen mal, resetea variables del environment.
