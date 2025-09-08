import rateLimit from 'express-rate-limit';

// Basic API rate limiter. Configure via env:
// RATE_LIMIT_WINDOW_MS (default 60000) and RATE_LIMIT_MAX (default 300)
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  limit: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please retry later.' },
});

export default apiLimiter;
