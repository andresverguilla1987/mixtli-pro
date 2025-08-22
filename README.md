# Mixtli Pro (fix auto-migrate & seed)

- `postinstall`: `prisma generate`
- `migrate-deploy`: aplica migraciones en Render/producción
- `seed`: crea 3 usuarios de ejemplo si la tabla está vacía

**Build Command (Render):**
```bash
npm install && npm run migrate-deploy && npm run seed
```
**Start Command (Render):**
```bash
node src/server.js
```
