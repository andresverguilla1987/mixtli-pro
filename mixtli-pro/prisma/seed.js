import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main () {
  const adminHash = await bcrypt.hash('Admin123!', 10)
  const userHash = await bcrypt.hash('User123!', 10)

  await prisma.user.upsert({
    where: { email: 'admin@mixtli.local' },
    update: {},
    create: { name: 'Admin', email: 'admin@mixtli.local', password: adminHash, role: 'ADMIN' }
  })

  await prisma.user.upsert({
    where: { email: 'user@mixtli.local' },
    update: {},
    create: { name: 'User One', email: 'user@mixtli.local', password: userHash, role: 'USER' }
  })

  console.log('🌱 Seed: admin y user creados.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
