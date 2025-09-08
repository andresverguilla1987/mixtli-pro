# Mixtli — Cron de Refresh (TARDE)

Este paquete agrega un **script listo** para usar en un Cron Job de Render que
dispara el endpoint protegido `POST /api/refresh` por la **tarde**.

## Archivos

- `render/cron/refresh-afternoon.sh` — script que hace `curl` al refresh.

## Variables de entorno requeridas en el Cron Job

- `DEMO_REFRESH_TOKEN` (obligatorio): el token que valida tu endpoint de refresh.
- `REFRESH_URL` (opcional): si no lo defines, usa `PUBLIC_URL` + `/api/refresh` o
  por defecto `https://mixtli-pro.onrender.com/api/refresh`.
- `PUBLIC_URL` (opcional): tu URL pública base sin `/` final (ej. `https://mixtli-pro.onrender.com`).
- `CURL_TIMEOUT` (opcional): segundos para cortar la petición (default: 25).

## Programación recomendada (tarde)

- Hora local CDMX (America/Mexico_City): **16:00** todos los días.
- Equivalente UTC: **22:00**.
- Expresión cron (UTC): `0 22 * * *`

> Render corre cron en UTC. Si alguna vez cambias la hora local, recuerda convertirla a UTC.

## Pasos en Render (Dashboard)

1. **New → Cron Job**
2. **Schedule**: `0 22 * * *` (22:00 UTC ≈ 16:00 CDMX)
3. **Command**:
   ```bash
   bash -lc "bash render/cron/refresh-afternoon.sh"
   ```
4. **Environment** (en la pestaña de env vars):
   - `DEMO_REFRESH_TOKEN=********`
   - (opcional) `PUBLIC_URL=https://mixtli-pro.onrender.com`
   - (opcional) `REFRESH_URL=https://mixtli-pro.onrender.com/api/refresh`
   - (opcional) `CURL_TIMEOUT=25`

### Alternativa sin repo (puro comando)

En el campo **Command** puedes pegar directamente esta línea (define tu token en env vars del job):

```bash
bash -lc 'curl -fsS -X POST "${REFRESH_URL:-https://mixtli-pro.onrender.com/api/refresh}"       -H "Authorization: Bearer $DEMO_REFRESH_TOKEN"       -H "X-Refresh-Token: $DEMO_REFRESH_TOKEN"       -H "Content-Type: application/json" --max-time 25'
```

## Notas
- El endpoint debe ser **idempotente**: si corre dos veces, no debe romperse.
- Loguea suficiente info en tu API para auditar cada refresh.
- Si necesitas otra hora adicional, crea otro Cron Job con distinta expresión.
