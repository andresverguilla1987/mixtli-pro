
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword } = require('../utils/hash');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password requeridos' });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email ya registrado' });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash, role: role || 'USER' },
      select: { id: true, email: true, name: true, role: true }
    });

    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error registrando usuario' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error en login' });
  }
}

module.exports = { register, login };
