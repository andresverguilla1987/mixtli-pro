import rateLimit from 'express-rate-limit';

export function applyRateLimit(app: any) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const max = Number(process.env.RATE_LIMIT_MAX || 300);
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
  });
  // Aplica a rutas de negocio. Ajusta prefijos según tu API.
  app.use(['/api', '/auth'], limiter);
}
