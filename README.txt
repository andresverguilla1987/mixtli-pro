# Mixtli – Seed de Admin (Prisma)

Este paquete agrega `prisma/seed.js` que crea/actualiza un usuario **admin** por email usando Prisma.
Lee estas variables de entorno (Render → Environment):
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Si no las defines, usa valores de fallback (solo para desarrollo).

## Requisitos
- Tu `package.json` debe tener el script:
  ```json
  "scripts": { "seed": "node prisma/seed.js" }
  ```

## Cómo correr el seed
### Opción A) Desde Render → Shell
1. Abre tu servicio en Render.
2. Ve a **Shell** y ejecuta:
   ```bash
   npm run seed
   ```

### Opción B) Local (si trabajas en tu máquina)
1. Define variables de entorno (o crea `.env` solo para local).
2. Ejecuta:
   ```bash
   npm run seed
   ```

Al terminar, verás en consola los datos del admin creado/actualizado.
