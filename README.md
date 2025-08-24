
---

## Scripts SQL (carpeta `sql/`)
- `seed.sql` → inserta 3 usuarios de demo (idempotente).
- `truncate.sql` → limpia la tabla y reinicia IDs.
- `reset.sql` → limpia + repuebla.
- `export.sql` → exporta usuarios a CSV (desde `psql`).
- `import.sql` → importa usuarios desde CSV (desde `psql`).

### Cómo usarlos (con `psql`)
1. Conéctate a tu DB de Render desde `psql` (usa la External Database URL).
2. Ejecuta, por ejemplo:
   ```sql
   \i sql/reset.sql
   ```
3. Para exportar:
   ```sql
   \copy "Usuario" TO 'usuarios_backup.csv' WITH CSV HEADER;
   ```

## render.yaml
Este archivo permite crear el servicio en Render directamente “From repo”.
- Build: `npm install`
- Start: `node server.js`
> Configura `DATABASE_URL` en el panel (no dentro del repo).

## Post-deploy automático (Render)
Este pack ya incluye:
- `prisma/seed.js` → inserta usuarios demo via Prisma.
- `render.yaml` con `postDeployCommand`:
  ```bash
  npx prisma migrate deploy || true
  npx prisma db seed || true
  ```
Con esto, después de cada deploy, Render aplicará migraciones pendientes y ejecutará el seed sin romper el despliegue si ya existen datos.

## Prisma Schema
Incluye `prisma/schema.prisma` con el modelo `Usuario`.
