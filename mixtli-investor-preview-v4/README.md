# Investor Preview v4 (tema verde / gradient)

- Nuevo **tema green** con gradientes y hojas decorativas (inspirado en tu referencia).
- Botón 🌓 alterna entre **verde** y **oscuro**. También puedes fijar `?theme=green|dark`.
- Todo funciona como v3 (Grafana/Prometheus/Status) + mejoras visuales.

## Montaje
```js
const path = require('path');
app.use('/preview', require('express').static(path.join(__dirname, 'public/preview'), { maxAge: '60s' }));
```
