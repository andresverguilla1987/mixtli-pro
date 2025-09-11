# Mixtli v1.1 Failsafe

Build con **eventos cableados a prueba de balas** + **overlay de logs** y **botón de test** para que no te quedes con botones muertos.

## Qué trae
- Guardar/Reset de **API Base** (localStorage).
- Botón **Probar** → hace GET `/api/health` y te muestra el status.
- **Log**: overlay con errores JS/Promise y trazas de las llamadas (útil para depurar).
- Subida con presign (GET y fallback POST) + PUT con barra, %/velocidad/ETA y preview.
- Script cargado con `defer` (por si el DOM no estaba listo).

## Uso
1. Abre la pestaña **Config**.
2. API Base:
   - Si usas proxy Netlify → déjalo vacío.
   - Si no, pon `https://mixtli-pro.onrender.com` (sin `/api`).
3. Pulsa **Probar** → debe mostrar `Health 200: {"status":"ok",...}`.
4. Ve a **Subir/Compartir**, elige archivo y sube.

Si algo falla, abre el **Log** y verás el detalle (CORS, 404, etc.).
