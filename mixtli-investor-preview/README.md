# Mixtli — Investor Preview (estático)

Página estática para mostrar **avances** en vivo a inversionistas.
- Muestra estado de `/salud`, latencia, y `X-Request-Id`.
- Botones a Grafana/Prometheus/Status Page.
- Roadmap y descargas (edita links en `assets/config.js`).

## Servir desde tu API (Express)
Copia `public/preview/` a `apps/api/public/preview/` y agrega:

```js
// server.js / server.ts (cerca de otras estáticas)
const path = require('path');
app.use('/preview', require('express').static(path.join(__dirname, 'public/preview'), { maxAge: '60s' }));
```

Ahora abre: `https://TU_API/preview`

## Servir en Netlify/estático
Sube la carpeta `public/preview/` como sitio estático. Ajusta `apiBase` en `assets/config.js` a la URL de tu API para que pida `/salud` cross-origin (asegúrate de CORS si aplica).
