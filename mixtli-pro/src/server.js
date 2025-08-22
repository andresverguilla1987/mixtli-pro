import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

// Raíz
app.get('/', (req, res) => {
  res.json({
    ok: true,
    msg: 'Mixtli API lista 🚀',
    endpoints: {
      salud: '/salud',
      usuarios: '/api/users'
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

// --- Users CRUD ---

// Listar
app.get('/api/users', async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })
  res.json(users)
})

// Crear
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {}
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email y password son obligatorios' })
    }
    const user = await prisma.user.create({ data: { name, email, password } })
    res.status(201).json(user)
  } catch (e) {
    res.status(400).json({ error: 'No se pudo crear', detail: String(e) })
  }
})

// Obtener por ID
app.get('/api/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return res.status(404).json({ error: 'No encontrado' })
  res.json(user)
})

// Actualizar por ID
app.put('/api/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { name, email, password } = req.body ?? {}
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { name, email, password }
    })
    res.json(updated)
  } catch (e) {
    res.status(400).json({ error: 'No se pudo actualizar', detail: String(e) })
  }
})

// Eliminar por ID
app.delete('/api/users/:id', async (req, res) => {
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
