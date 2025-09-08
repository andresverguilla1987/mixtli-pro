const Sentry = require('@sentry/node');

function initSentry() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SERVICE_NAME || 'mixtli-api',
  });
}

function sentryRequestHandler() {
  return process.env.SENTRY_DSN ? Sentry.Handlers.requestHandler() : (req, res, next) => next();
}
function sentryErrorHandler() {
  return process.env.SENTRY_DSN ? Sentry.Handlers.errorHandler() : (err, req, res, next) => next(err);
}

module.exports = { initSentry, sentryRequestHandler, sentryErrorHandler };
