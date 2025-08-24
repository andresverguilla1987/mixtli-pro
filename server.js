const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, nombre: user.nombre }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const [_bearer, token] = hdr.split(' ');
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

app.get('/', (req, res) => {
  res.json({
    mensaje: "✨ Mixtli API",
    rutas: {
      salud: "/salud",
      debug: "/__debug",
      listarUsuarios: "/api/users",
      crearUsuario: "/api/users",
      actualizarUsuario: "/api/users/:id",
      eliminarUsuario: "/api/users/:id",
      registrar: "/auth/register",
      login: "/auth/login",
      yo: "/me (Bearer token)"
    }
  });
});

app.get('/salud', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Servidor funcionando 🟢' });
});

app.get('/__debug', (req, res) => {
  res.json({
    time: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      PORT: process.env.PORT || null,
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET
    }
  });
});

app.post('/auth/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) return res.status(400).json({ error: 'nombre, email y password requeridos' });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({
      data: { nombre, email, passwordHash: hash }
    });
    const token = signToken(user);
    res.status(201).json({ ok: true, token, user: { id: user.id, nombre: user.nombre, email: user.email } });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email ya existe' });
    console.error('Error register:', e);
    res.status(500).json({ error: 'Error registrando' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email y password requeridos' });
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Credenciales inválidas' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = signToken(user);
    res.json({ ok: true, token, user: { id: user.id, nombre: user.nombre, email: user.email } });
  } catch (e) {
    console.error('Error login:', e);
    res.status(500).json({ error: 'Error en login' });
  }
});

app.get('/me', auth, async (req, res) => {
  const user = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { id: true, nombre: true, email: true } });
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true, user });
});

app.get('/api/users', async (req, res) => {
  const data = await prisma.usuario.findMany({ orderBy: { id: 'asc' }, select: { id: true, nombre: true, email: true } });
  res.json({ ok: true, data });
});

app.post('/api/users', async (req, res) => {
  try {
    const { nombre, email } = req.body;
    if (!nombre || !email) return res.status(400).json({ error: 'nombre y email son requeridos' });
    const nuevo = await prisma.usuario.create({ data: { nombre, email } });
    res.status(201).json({ ok: true, data: nuevo });
  } catch (e) {
    if (e.code == 'P2002') return res.status(409).json({ error: 'email ya existe' });
    console.error('Error creando usuario:', e);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const { nombre, email } = req.body;
    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { ...(nombre && { nombre }), ...(email && { email }) }
    });
    res.json({ ok: true, data: actualizado });
  } catch (e) {
    if (e.code == 'P2002') return res.status(409).json({ error: 'email ya existe' });
    if (e.code == 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error('Error actualizando usuario:', e);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    const eliminado = await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, data: eliminado });
  } catch (e) {
    if (e.code == 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.error('Error eliminando usuario:', e);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
