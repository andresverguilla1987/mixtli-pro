# Render Hotfix (Root server)

## Qué soluciona
- Te asegura que `GET /` responde en Render con `{ status: "ok" }` para que la demo hosted no dé 404.
- Monta automáticamente `/security`, `/events` y `/debug` desde `notifications/` si existen.
- Define comandos de build/start compatibles con Render.

## Cómo aplicarlo (2 minutos)
1. Copia estos archivos a la **raíz** de tu repo:
   - `server.js`  (root)
   - `package.json` (root)
   - `render.yaml` (opcional, si usas Infra-as-code en Render)
2. Haz commit y push a GitHub.
3. En Render, en tu servicio web:
   - **Build Command**: `pnpm i && pnpm --filter ./notifications i && cd notifications && pnpm prisma:gen && pnpm prisma:migrate --name init || true`
   - **Start Command**: `node server.js`
4. Redeploy. Abre:
   - `https://<tu-servicio>.onrender.com/` → debe mostrar `{ status: "ok", ... }`

## Si no usas `render.yaml`
No pasa nada, con que ajustes Build/Start en el dashboard de Render es suficiente.

## Variables recomendadas
- `DRY_RUN_EMAIL=1` (demo segura)
- `DATABASE_URL=file:/data/dev.db` y un Disk en `/data` si usas SQLite.
