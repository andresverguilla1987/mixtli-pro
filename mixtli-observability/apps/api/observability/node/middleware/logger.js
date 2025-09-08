const pino = require('pino');
const pinoHttp = require('pino-http');

const level = process.env.LOG_LEVEL || 'info';
const baseLogger = pino({ level });

module.exports = function logger() {
  return pinoHttp({
    logger: baseLogger,
    customProps: (req, res) => ({
      requestId: req.requestId || (res.locals && res.locals.requestId),
      service: process.env.SERVICE_NAME || 'mixtli-api',
      env: process.env.NODE_ENV || 'development',
    }),
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          headers: { 'x-request-id': req.requestId },
          remoteAddress: req.socket && req.socket.remoteAddress,
        };
      },
    },
  });
};
