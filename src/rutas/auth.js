const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

router.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const exists = await prisma.usuario.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'email en uso' });
    const passwordHash = await bcrypt.hash(password, 10);
    const u = await prisma.usuario.create({ data: { email, passwordHash } });
    return res.status(201).json({ id: u.id, email: u.email, createdAt: u.createdAt });
  } catch (e) {
    console.error('register', e);
    return res.status(500).json({ error: 'error' });
  }
});

router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const u = await prisma.usuario.findUnique({ where: { email } });
    if (!u) return res.status(401).json({ error: 'credenciales' });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: 'credenciales' });
    const token = jwt.sign({ sub: u.id, email: u.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } catch (e) {
    console.error('login', e);
    return res.status(500).json({ error: 'error' });
  }
});

router.post('/api/auth/refresh', authRequired, async (req, res) => {
  try {
    const token = jwt.sign({ sub: req.user.sub, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } catch (e) {
    return res.status(500).json({ error: 'error' });
  }
});

module.exports = router;
