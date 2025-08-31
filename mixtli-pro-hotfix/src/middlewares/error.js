module.exports = function errorHandler(err, req, res, next) {
  console.error('Error global:', err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno' });
};
