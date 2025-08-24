
# Mixtli – CI workflow (cartero)

Este paquete solo agrega el workflow de GitHub Actions para correr tu colección Postman desde la carpeta `cartero/` y, si pasa, disparar deploy a Render.

## Estructura
- `.github/workflows/ci.yml`

## Requisitos
1) En tu repo ya deben existir:
   - `cartero/mixtli-api-prod.postman_collection.json`
   - `cartero/mixtli-prod.postman_environment.json`
2) Secrets en GitHub (Settings → Secrets → Actions):
   - `RENDER_SERVICE_ID`
   - `RENDER_API_KEY`

## Uso
- Sube este archivo a la raíz del repo (manteniendo la carpeta `.github/workflows/`).
- Haz `push` a `main`. El workflow ejecutará:
  - Tests con Newman (reportes HTML y JUnit como artifacts).
  - Deploy a Render si todo pasa en verde.
