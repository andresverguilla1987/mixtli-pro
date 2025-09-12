# Instalación Backend (Render) - Plan Familiar

1) **Prisma**
   - Abre `prisma/schema.prisma`
   - Copia el contenido de `backend/prisma/snippets/schema_family.prisma` y pégalo al final (sin romper tus modelos existentes).
   - Instala deps si falta: `npm i @prisma/client bcryptjs`
   - Corre migración:
     ```bash
     npx prisma generate
     npx prisma migrate dev -n family_plan_albums
     ```

2) **Rutas & Middleware**
   - Copia:
     - `backend/src/middleware/auth.js`
     - `backend/src/utils/r2prefix.js`
     - `backend/src/routes/family.js`
     - `backend/src/routes/albums.js`
   - En tu `server.js` (o `apps/api/src/server.ts/js`), agrega:
     ```js
     const express = require('express');
     const app = module.exports = global.app || require('express')();
     const requireUser = require('./src/middleware/auth');
     const familyRoutes = require('./src/routes/family');
     const albumRoutes  = require('./src/routes/albums');

     // Monta después de tu CORS y body-parser:
     app.use('/api/family', requireUser, familyRoutes);
     app.use('/api/albums', requireUser, albumRoutes);
     ```

3) **Adaptar storage/list/presign/signget**
   - Dentro de tus handlers existentes:
     - Recibe `ownerId`, `albumId` desde query/body.
     - Consulta el álbum por `id` y valida permisos según `visibility` y membresía.
     - Construye prefijo con `r2Prefix({ familyId: album.familyId, userId: ownerId, albumSlug: album.slug })`.
     - Para uploads usa `r2Key({ familyId, userId: ownerId, albumSlug, filename })`.

4) **Redeploy en Render**
   - `npm run build` (si aplica) y despliega.
   - Verifica logs: rutas `/api/family/*` y `/api/albums/*` deben responder 200.
