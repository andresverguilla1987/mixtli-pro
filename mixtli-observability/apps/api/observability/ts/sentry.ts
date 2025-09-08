import * as Sentry from '@sentry/node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.2,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SERVICE_NAME || 'mixtli-api',
  });
}

export function sentryRequestHandler() {
  return process.env.SENTRY_DSN ? (Sentry as any).Handlers.requestHandler() : (_req: any, _res: any, next: any) => next();
}
export function sentryErrorHandler() {
  return process.env.SENTRY_DSN ? (Sentry as any).Handlers.errorHandler() : (err: any, _req: any, _res: any, next: any) => next(err);
}
