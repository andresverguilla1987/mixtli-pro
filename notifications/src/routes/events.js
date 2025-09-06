import express from 'express';
import { sendTemplate } from '../lib/mailer.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const user = req.user;
  const result = await sendTemplate(user.email, 'login_new_device', 'Nuevo inicio de sesión', {
    name: user.name || user.email,
    app_name: process.env.APP_NAME || 'Mixtli',
    date_human: new Date().toLocaleString('es-MX'),
    ip: req.ip,
    ua: req.headers['user-agent'],
    secure_link: (process.env.APP_BASE_URL || '') + '/security',
    email: user.email,
    year: new Date().getFullYear()
  });
  res.json({ sent: true, ...(result?.dryRun ? { dryRun: true } : {}) });
});

router.post('/twofa-enabled', async (req, res) => {
  const user = req.user;
  const result = await sendTemplate(user.email, 'twofa_enabled', 'Autenticación en dos pasos activada', {
    name: user.name || user.email,
    app_name: process.env.APP_NAME || 'Mixtli',
    manage_url: (process.env.APP_BASE_URL || '') + '/settings/security',
    email: user.email,
    year: new Date().getFullYear()
  });
  res.json({ sent: true, ...(result?.dryRun ? { dryRun: true } : {}) });
});

router.post('/password-reset-completed', async (req, res) => {
  const user = req.user;
  const result = await sendTemplate(user.email, 'password_reset_completed', 'Tu contraseña se restableció', {
    name: user.name || user.email,
    app_name: process.env.APP_NAME || 'Mixtli',
    support_url: (process.env.APP_BASE_URL || '') + '/support',
    email: user.email,
    year: new Date().getFullYear()
  });
  res.json({ sent: true, ...(result?.dryRun ? { dryRun: true } : {}) });
});

export default router;
