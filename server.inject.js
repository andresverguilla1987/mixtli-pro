// === INICIO INYECCIÓN PATCH ===
const morgan = require('morgan');
app.use(morgan('dev'));

// Salud (si ya existe déjalo, si no, agrega esto)
if (!app._router || !app._router.stack.some(l => l.route && l.route.path === '/salud')) {
  app.get('/salud', (req, res) => res.json({ ok: true, status: 'UP' }));
}

// 404 coherente
app.use((req, res, next) => {
  return res.status(404).json({
    ok: false,
    code: 'NOT_FOUND',
    message: `No existe la ruta ${req.method} ${req.originalUrl}`
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('❌ Error handler:', err);
  const status = err.status || 500;
  const payload = {
    ok: false,
    code: err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR'),
    message: err.message || 'Error inesperado'
  };
  if (err.details) payload.details = err.details;
  return res.status(status).json(payload);
});

// === FIN INYECCIÓN PATCH ===
