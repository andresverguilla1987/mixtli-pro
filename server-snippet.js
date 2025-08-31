// Snippet para agregar en server.js o app.js

// 1) Endpoints de health en varias rutas
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', at: '/health' }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', at: '/api/health' }));
app.get('/api/v1/health', (req, res) => res.status(200).json({ status: 'ok', at: '/api/v1/health' }));

// 2) Introspección de rutas
app.get('/__routes', (req, res) => {
  const getPaths = (stack, base='') => {
    const out = [];
    stack.forEach(layer => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods)
          .filter(m => layer.route.methods[m])
          .map(m => m.toUpperCase());
        out.push({ path: base + layer.route.path, methods });
      } else if (layer.name === 'router' && layer.handle && layer.regexp) {
        const match = layer.regexp.toString().match(/\/(?:\w|\.|-)+/g);
        const prefix = match ? match.join('').replace(/\\/g, '/') : '';
        if (layer.handle.stack) out.push(...getPaths(layer.handle.stack, prefix));
      }
    });
    return out;
  };
  try {
    const routes = app._router && app._router.stack ? getPaths(app._router.stack) : [];
    res.json({ count: routes.length, routes });
  } catch (e) {
    res.status(500).json({ error: 'introspection_failed', message: String(e) });
  }
});

// 3) Middleware para loguear misses (404)
app.use((req, res, next) => {
  console.warn('MISS =>', req.method, req.originalUrl);
  return res.status(404).json({ error: 'not_found', method: req.method, path: req.originalUrl });
});
