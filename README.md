# Mixtli API - Zip funcional

Incluye rutas con CRUD completo de usuarios (GET lista, GET por ID, POST, PUT, DELETE).

## Uso
1. Instala dependencias (asegúrate de tener prisma configurado con tu BD):
   ```bash
   npm install express @prisma/client
   ```

2. Corre migraciones (si aplica):
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. Inicia el servidor:
   ```bash
   node app.js
   ```

4. Endpoints disponibles:
   - GET `/api/salud`
   - GET `/api/users`
   - GET `/api/users/:id`
   - POST `/api/users`
   - PUT `/api/users/:id`
   - DELETE `/api/users/:id`
