const express = require('express');
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Métricas HTTP
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestsTotal);

function instrument(app) {
  // Middleware para contar y medir
  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
    res.on('finish', () => {
      const labels = { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode };
      httpRequestsTotal.inc(labels);
      end({ status_code: res.statusCode, method: req.method, route: req.route?.path || req.path });
    });
    next();
  });
}

const metricsRouter = express.Router();
metricsRouter.get('/', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

module.exports = { metricsRouter, instrument, register, httpRequestDuration };
