# Mixtli Users Patch

Archivos para reemplazar en tu proyecto:

- `src/rutas/users.js`
- (Opcional) `server.js` si quieres el ejemplo mínimo de cómo montar la ruta

## Cómo aplicar
1. Descomprime y copia `src/rutas/users.js` encima del archivo existente.
2. Asegúrate de tener instalados:
   - `bcryptjs`
   - `dotenv` (si tu server.js lo usa)
3. Ejecuta:
   ```bash
   npm install bcryptjs dotenv
   npm start
   ```

## Endpoints

- GET    /api/users
- GET    /api/users/:id
- POST   /api/users    { name, email, password }
- PUT    /api/users/:id   { name?, email?, password? }
- DELETE /api/users/:id
