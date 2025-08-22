
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword } = require('../utils/hash');

async function listUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error listando usuarios' });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Campos requeridos' });
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash, role: role || 'USER' },
      select: { id: true, email: true, name: true, role: true }
    });
    res.status(201).json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error creando usuario' });
  }
}

async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
}

module.exports = { listUsers, createUser, me };
