// apps/api/routes/preview-auth-demo.js
const { Router } = require('express');
const crypto = require('crypto');

module.exports = function previewAuthDemo({ basePath = '' } = {}) {
  const router = Router();
  router.post(`${basePath}/auth/register`, (req, res) => {
    const { name, email, plan } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, error: 'email required' });
    const id = crypto.randomUUID();
    res.json({ ok:true, user: { id, name: name || email.split('@')[0], email, plan: plan || 'free' } });
  });
  return router;
};

// USO:
// const previewAuthDemo = require('./apps/api/routes/preview-auth-demo');
// app.use(previewAuthDemo({ basePath: '' }));
