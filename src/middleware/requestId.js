
import { randomUUID } from 'crypto';

export function requestId() {
  return function(req, res, next) {
    const rid = req.headers['x-request-id'] || randomUUID();
    req.id = rid;
    res.setHeader('x-request-id', rid);
    next();
  }
}
