const { randomUUID } = require('node:crypto');
module.exports = function requestId(opts = {}) {
  const headerName = opts.headerName || 'x-request-id';
  return function(req, res, next) {
    const incoming = req.headers[headerName];
    const id = (incoming && String(incoming).trim()) || randomUUID();
    req.requestId = id;
    res.locals = res.locals || {};
    res.locals.requestId = id;
    res.setHeader(headerName, id);
    next();
  };
};
