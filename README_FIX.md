# Mixtli – Fix Prisma & Users

Este ZIP contiene **solo los archivos necesarios** para corregir:
- Desfase de Prisma (`enableTracing`)
- Campo `passwordHash` ausente
- `users.js` que ahora genera `passwordHash` y oculta ese campo en respuestas

## Archivos incluidos
- `package.json` (prisma 5.22.0 pareado + postinstall generate)
- `prisma/schema.prisma` (modelo `Usuario` con `passwordHash`, `updatedAt`)
- `src/rutas/users.js` (crea hash con `bcryptjs` y selecciona campos seguros)

## Cómo aplicar (GitHub → Render)
1. **En GitHub**, sube / reemplaza estos archivos en las mismas rutas.
2. En **Render** → pestaña del servicio:
   - Click **“Clear build cache & deploy”**.
3. Cuando el deploy esté verde, abre **Shell** y ejecuta:
   ```bash
   npx prisma generate
   npx prisma db push --force-reset
   ```
4. Probar en Postman:
   - **POST** `https://mixtli-pro.onrender.com/api/users`
     ```json
     { "nombre": "Usuario Demo", "email": "demo_{{timestamp}}@mixtli.app", "password": "Secreta123" }
     ```
   - **GET**  `https://mixtli-pro.onrender.com/api/users`

Con eso debe quedar sin los errores vistos en logs.
