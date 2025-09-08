const rateLimit = require('express-rate-limit');
const client = require('prom-client');

const limiter429 = new client.Counter({
  name: 'http_429_total',
  help: 'Respuestas 429 (rate limit)',
  labelNames: ['route', 'ip']
});

module.exports = function makeLimiter(opts = {}) {
  const limiter = rateLimit({
    windowMs: opts.windowMs || 60_000,
    limit: opts.limit || 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req, res) {
      limiter429.inc({ route: req.route?.path || req.path, ip: req.ip || 'unknown' });
      res.status(429).json({ ok: false, error: 'Too Many Requests' });
    }
  });
  return limiter;
};
