# Mixtli — Investor Demo Kit

Todo lo necesario para correr una demo controlada desde terminal/Postman y Render.

## Rápido
```bash
# 1) Exporta variables (ajusta URL/TOKEN si aplica)
export PUBLIC_URL="${PUBLIC_URL:-https://mixtli-pro.onrender.com}"
export DEMO_REFRESH_TOKEN="${DEMO_REFRESH_TOKEN:-changeme}"

# 2) Smoke + flujo demo
bash scripts/hit-demo.sh

# 3) Semilla de datos mínima (opcional)
bash scripts/seed-demo.sh

# 4) Reset rápido (opcional)
bash scripts/reset-demo.sh
```

## Postman
Importa `postman/mixtli-demo.postman_collection.json` y configura la variable `base_url` = tu URL pública.
Si usas token, agrega `DEMO_REFRESH_TOKEN` como variable de colección o Authorization header.

## OpenAPI
Archivo de referencia en `openapi/openapi.yaml` (minimal, ajusta según tu API real).
