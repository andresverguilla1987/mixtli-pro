# Mixtli CORS + Postman Prod

Este paquete incluye:

- **server-cors.js** → ejemplo de servidor Express con CORS dinámico y Helmet seguro para producción.
- **Mixtli-Prod.postman_environment.json** → Environment de Postman listo para Producción.

## Uso rápido

### Backend (Render)
1. Sube `server-cors.js` o integra las líneas a tu `server.js`.
2. En Render agrega env var:
   ```
   ALLOWED_ORIGINS=https://tu-frontend.com,https://app.tu-frontend.com
   ```
3. Verifica con:
   ```bash
   curl -i -X OPTIONS "https://mixtli-pro.onrender.com/api/users"      -H "Origin: https://tu-frontend.com"      -H "Access-Control-Request-Method: POST"
   ```

### Postman
1. Importa `Mixtli-Prod.postman_environment.json`.
2. Selecciona **Mixtli Producción** como environment.
3. Cambia `baseUrl` a tu dominio real de prod (Render custom domain o la URL pública).
4. Corre la colección Mixtli-PRO.

## Tips
- Solo se permiten orígenes definidos en `ALLOWED_ORIGINS`.
- En dev, se aceptan automáticamente `localhost` y `127.0.0.1`.
- Helmet añade headers de seguridad extra.

