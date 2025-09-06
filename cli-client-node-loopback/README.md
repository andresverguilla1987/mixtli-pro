
# Mixtli OAuth CLI (Loopback)

Cliente CLI que abre el navegador (GET /oauth/authorize) y captura el `code` en `http://127.0.0.1:<PORT>/callback`.

> DEMO: el backend acepta `?demo_access_token=` si `DEMO_ENABLE_QUERY_ACCESS=true` para simular que el usuario ya está autenticado. En producción, omite ese parámetro y deja que el usuario inicie sesión en la UI del proveedor.

## Uso
```bash
cd cli-client-node-loopback
cp .env.sample .env
npm i
npm start
```
