import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 10000

app.get('/', (req, res) => {
  res.json({ status: 'Servidor funcionando 🔥', version: '1.0.1' })
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } })
    res.json(users)
  } catch (err) {
    console.error('Error /api/users:', err)
    res.status(500).json({ error: 'DB error', detail: String(err) })
  }
})

app.listen(PORT, () => {
  console.log(`✅ API lista en puerto ${PORT}`)
})
