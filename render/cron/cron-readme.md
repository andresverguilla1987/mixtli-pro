# Mixtli Demo: Cron en Render

## Horario recomendado
- 06:30 CDMX = **12:30 UTC**
- Cron: `30 12 * * *`

## Crear Cron Job
- Name: `mixtli-demo-refresh-am`
- Start Command:
  ```bash
  bash -lc 'curl -fsS -X POST "$API_URL/api/refresh" -H "Authorization: Bearer $DEMO_CRON_SECRET"' 
  ```
- Schedule:
  ```
  30 12 * * *
  ```
- Env Vars:
  - `API_URL` = `https://mixtli-pro.onrender.com`
  - `DEMO_CRON_SECRET` = (token secreto que debe coincidir con el backend)

## Probar manualmente
```bash
curl -i -X POST "https://mixtli-pro.onrender.com/api/refresh"       -H "Authorization: Bearer $DEMO_CRON_SECRET"
```
