# Investor Preview v3 (con enlaces internos activos)

- Ahora los botones **siempre** llevan a algún lado:
  - **Grafana** → `./grafana.html` (redirige a tu URL si la config está puesta o muestra instrucciones para setear `?url=`).
  - **Prometheus** → `./prom.html` igual que arriba.
  - **Status Page** → `./status/` (incluye un ejemplo con `incidents.json`).

## Cómo pasar tus URLs sin re-hacer el build
Usa query params en la misma ruta `/preview/`:
```
/preview/?apiBase=https://tu-api&grafana=https://tu-grafana&prometheus=https://tu-prom
```
O edita `assets/config.js` y sube.

## Montaje en la API
```js
const path = require('path');
app.use('/preview', require('express').static(path.join(__dirname, 'public/preview'), { maxAge: '60s' }));
```
