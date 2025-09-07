# Railway Deploy (Docker)

Railway no requiere archivo de config; se recomienda crear servicios vía Dashboard.

## Pasos

1) **Nuevo proyecto** en Railway y conecta tu repo de GitHub.
2) **Agrega Plugins**:
   - **PostgreSQL** → obtendrás `DATABASE_URL`.
   - **Redis** → obtendrás `REDIS_URL`.

3) **Crea dos servicios** desde el mismo repo:
   - **API**:
     - Tipo: **Dockerfile**
     - **Dockerfile Path**: `docker/Dockerfile.api`
     - **Context**: raíz del repo (.)
     - Variables:
       - `APP_ENV=production`
       - `JWT_SECRET` (valor aleatorio)
       - `SENDGRID_API_KEY` (opcional)
       - `SENDGRID_FROM=noreply@mixtli.local`
       - `DATABASE_URL` (desde el plugin Postgres)
       - `REDIS_URL` (desde el plugin Redis)
     - Puerto expuesto: **8080**
     - Healthcheck Path: `/health`

   - **Worker**:
     - Tipo: **Dockerfile**
     - **Dockerfile Path**: `docker/Dockerfile.worker`
     - **Context**: raíz del repo (.)
     - Variables:
       - `APP_ENV=production`
       - `DATABASE_URL` (plugin)
       - `REDIS_URL` (plugin)
       - `SENDGRID_API_KEY` y `SENDGRID_FROM` si usarás correo.

4) **Deploy**. Railway construirá con Docker y levantará contenedores.
5) **Probar**:
   - `GET /health` en la URL del servicio API.
   - En Redis/Worker, encola un job: `POST /scoring/retrain` y mira logs del Worker.

> Nota: Si usas monorepo, especificar Dockerfile Path y Context al **root** evita problemas de dependencias de PNPM workspaces.
