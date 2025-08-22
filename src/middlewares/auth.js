// Si ya tienes este archivo en tu proyecto, ignora este y usa el tuyo.
const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = { id: payload.id || payload.sub, email: payload.email, role: payload.role || 'USER' };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { authRequired };
