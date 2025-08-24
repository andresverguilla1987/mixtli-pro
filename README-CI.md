# Mixtli – CI Workflow (solo)

Este zip solo agrega el **workflow** de GitHub Actions.

## Estructura
```
.github/workflows/ci.yml
```

## Requisitos
- En el repo ya existen las carpetas **cartero/** con:
  - `mixtli-api-prod.postman_collection.json`
  - `mixtli-prod.postman_environment.json`
- Secrets en GitHub (Settings → Secrets and variables → Actions):
  - `DATABASE_URL` (Postgres de Render)
  - `RENDER_API_KEY` (API key de Render)
  - `RENDER_SERVICE_ID` (Service ID de tu servicio web en Render)

## ¿Qué hace?
Al **push a main**:
1. Instala `newman` y corre los **smoke tests** contra `https://mixtli-pro.onrender.com`.
2. Si pasan, llama a la API de **Render** para crear un **deploy** y espera hasta que quede *live*.

No necesitas tocar nada más.
