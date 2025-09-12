// Simple auth middleware: expects 'x-user-id' header set by the frontend after register/login.
// Replace later with your real auth/token.
module.exports = function requireUser(req, res, next){
  const userId = req.header('x-user-id');
  if (!userId) return res.status(401).json({ error: 'auth_required' });
  req.userId = userId;
  next();
};
