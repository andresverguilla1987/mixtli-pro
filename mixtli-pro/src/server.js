import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const app = express()
const prisma = new PrismaClient()

// CORS (ajusta origins si tienes frontend)
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'dev-super-secret-change-me'

// Helpers
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || ''
  const [, token] = auth.split(' ')
  if (!token) return res.status(401).json({ error: 'Token requerido' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// Schemas
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

// Raíz
app.get('/', (req, res) => {
  res.json({
    ok: true,
    msg: 'Mixtli API + JWT 🚀',
    endpoints: {
      salud: '/salud',
      register: '/auth/register',
      login: '/auth/login',
      users: '/api/users'
    }
  })
})

// Salud + chequeo DB
app.get('/salud', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, db: 'ok' })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'DB no responde', detail: String(e) })
  }
})

// --- Auth ---
app.post('/auth/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) return res.status(409).json({ error: 'Email ya registrado' })
    const hash = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, password: hash, role: 'USER' },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })
    const token = signToken({ sub: user.id, email: user.email, role: user.role })
    res.status(201).json({ user, token })
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: 'Datos inválidos', detail: e.issues })
    res.status(400).json({ error: 'No se pudo registrar', detail: String(e) })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email: data.email } })
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })
    const ok = await bcrypt.compare(data.password, user.password)
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })
    const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }
    const token = signToken({ sub: user.id, email: user.email, role: user.role })
    res.json({ user: publicUser, token })
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: 'Datos inválidos', detail: e.issues })
    res.status(400).json({ error: 'No se pudo iniciar sesión', detail: String(e) })
  }
})

// --- Users CRUD (protegido) ---
app.get('/api/users', requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({ select: { id:true, name:true, email:true, role:true, createdAt:true }, orderBy: { id: 'asc' } })
  res.json(users)
})

app.get('/api/users/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const user = await prisma.user.findUnique({ where: { id }, select: { id:true, name:true, email:true, role:true, createdAt:true } })
  if (!user) return res.status(404).json({ error: 'No encontrado' })
  res.json(user)
})

app.post('/api/users', requireAuth, async (req, res) => {
  try {
    const { name, email, password, role } = req.body ?? {}
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email y password son obligatorios' })
    const hash = await bcrypt.hash(password, 10)
    const created = await prisma.user.create({ data: { name, email, password: hash, role: role === 'ADMIN' ? 'ADMIN' : 'USER' } })
    res.status(201).json({ id: created.id, name: created.name, email: created.email, role: created.role })
  } catch (e) {
    res.status(400).json({ error: 'No se pudo crear', detail: String(e) })
  }
})

app.put('/api/users/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const { name, email, password, role } = req.body ?? {}
  try {
    const data = { name, email, role }
    if (password) data.password = await bcrypt.hash(password, 10)
    const updated = await prisma.user.update({ where: { id }, data })
    res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role })
  } catch (e) {
    res.status(400).json({ error: 'No se pudo actualizar', detail: String(e) })
  }
})

app.delete('/api/users/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.user.delete({ where: { id } })
    res.json({ ok: true })
  } catch (e) {
    res.status(404).json({ ok: false, error: 'No encontrado' })
  }
})

// Arranque
const PORT = process.env.PORT ? Number(process.env.PORT) : 10000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})

// Cierre limpio
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0) })
process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0) })
