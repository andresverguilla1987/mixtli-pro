import logger from './logging';

export function notFound(_req: any, res: any) {
  res.status(404).json({ ok: false, error: 'Not Found' });
}

export function errorHandler(err: any, _req: any, res: any, _next: any) {
  const status = err?.status || 500;
  logger.error({ err, status }, 'Unhandled error');
  res.status(status).json({ ok: false, error: err?.message || 'Internal Error' });
}
