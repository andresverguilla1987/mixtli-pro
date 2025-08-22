# Seed para Mixtli Pro (Usuarios)

Archivos incluidos:
- `prisma/seed.js` → crea 3 usuarios si la tabla está vacía.
- `package.json.example-additions.json` → referencia de cómo agregar el script `"seed"`.

## Cómo usar

1) Sube **solo** `prisma/seed.js` a tu repo (GitHub → Add file → Upload files).
2) Edita tu `package.json` y agrega el script:
   ```json
   {
     "scripts": {
       "seed": "node prisma/seed.js"
     }
   }
   ```
   (no borres lo que ya tienes; solo agrega `"seed"` dentro de `"scripts"`).

3) En **Render** → tu servicio → abre **Shell** y ejecuta:
   ```bash
   node prisma/seed.js
   ```
   o si agregaste el script:
   ```bash
   npm run seed
   ```

Necesitas que `DATABASE_URL` esté configurada y accesible.
