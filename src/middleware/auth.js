
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, email: payload.email, plan: payload.plan };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}
