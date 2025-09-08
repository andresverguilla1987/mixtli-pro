module.exports = function auditLogger() {
  return function(req, res, next) {
    res.on('finish', () => {
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
      const entry = {
        audit: true,
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode,
        userId: req.user?.id || req.headers['x-user-id'] || null,
        tenant: req.headers['x-tenant-id'] || null,
        requestId: req.requestId,
        ts: new Date().toISOString(),
      };
      if (req.log && typeof req.log.info === 'function') {
        req.log.info(entry, 'audit');
      } else {
        // fallback
        console.log(JSON.stringify(entry));
      }
    });
    next();
  };
};
