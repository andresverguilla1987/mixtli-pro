# CI/CD

## CI (build + typecheck)
- Workflow: `.github/workflows/ci.yml`
- Corre en cada push y PR: instala PNPM, compila TS y genera Prisma Client.

## CD a Render (opcional)
- Workflow: `.github/workflows/deploy-render.yml`
- Requiere agregar Secrets a tu repo:
  - `RENDER_API_KEY` → de tu cuenta en Render
  - `RENDER_SERVICE_API_ID` → ID del servicio web (api)
  - `RENDER_SERVICE_WORKER_ID` → ID del worker
- Despliega al hacer push a `main`.

## Blueprint
- `render.yaml` define web (api), worker, Postgres y Redis administrados.
- AutoDeploy activado: Render detecta cambios en el repo y reconstruye.
