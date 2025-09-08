# Runbook — Demo para Inversionistas (15 min)

**Objetivo**: mostrar salud del servicio, CRUD mínimo y refresh del demo.

## Preparación (5 min antes)
- Render: verifica que el servicio esté *Green* y los cron jobs activos.
- Terminal: exporta variables
  ```bash
  export PUBLIC_URL="${PUBLIC_URL:-https://mixtli-pro.onrender.com}"
  export DEMO_REFRESH_TOKEN="${DEMO_REFRESH_TOKEN:-changeme}"
  ```
- Postman listo con la colección importada (variable `base_url` = `https://mixtli-pro.onrender.com`).

## Guion (live)
1) **Salud**
   ```bash
   curl -s -D- -o /dev/null "$PUBLIC_URL/" | head -n 1
   curl -s "$PUBLIC_URL/salud"
   ```
2) **Usuarios (CRUD rápido)**
   ```bash
   # Listar
   curl -s "$PUBLIC_URL/api/users"
   # Crear (mínimo cuerpo; si tu API acepta vacío, úsalo tal cual)
   curl -s -X POST "$PUBLIC_URL/api/users" -H "Content-Type: application/json" -d '{}'
   # Actualizar (endpoint tolerante sin ID, como en tus logs)
   curl -s -X PUT "$PUBLIC_URL/api/users/" -H "Content-Type: application/json" -d '{"name":"Demo Update"}'
   # Borrar (endpoint tolerante sin ID, como en tus logs)
   curl -s -X DELETE "$PUBLIC_URL/api/users/"
   ```
3) **Refresh demo**
   ```bash
   curl -s -X POST "$PUBLIC_URL/api/refresh" -H "Authorization: Bearer $DEMO_REFRESH_TOKEN"
   ```

## Tips
- Si algo no responde en <2s, menciona que hay *cold start* o *rate limits* del proveedor.
- Evita navegar por logs largos en vivo; mantén los comandos listos.
