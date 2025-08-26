PARCHE RÁPIDO - Rutas de usuarios (Prisma ↔️ API)

Qué cambia:
- Usa el campo real del schema Prisma `CorreoElectronico` en vez de `email`/`nombre`.
- CRUD completo: GET/POST/PUT/DELETE con selects correctos.
- Manejo de errores y códigos de estado.

Cómo aplicarlo:
1) En tu repo, reemplaza el archivo `src/rutas/users.js` por el de este zip.
2) Haz commit & push a GitHub.
3) Render auto-deploy se disparará. También puedes redeploy manual.
4) En Postman:
   - POST /api/users  (raw JSON)
     {
       "email": "demo_{{timestamp}}@example.com",
       "password": "123456"
     }
   - GET /api/users
   - PUT /api/users/:id  (puedes enviar email y/o password)
   - DELETE /api/users/:id

Notas:
- El modelo Prisma esperado es:

  model Usuario {
    identificacion     Int      @id @default(autoincrement())
    CorreoElectronico  String   @unique
    passwordHash       String
    createdAt          DateTime @default(now())
    actualizadoEn      DateTime @updatedAt
  }

- No se requiere `nombre`.
