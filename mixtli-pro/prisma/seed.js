import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main () {
  const count = await prisma.user.count()
  if (count === 0) {
    const hash = await bcrypt.hash('Admin123!', 10)
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@mixtli.local',
        password: hash,
        role: 'ADMIN'
      }
    })
    console.log('🌱 Seed: usuario admin creado (admin@mixtli.local / Admin123!)')
  } else {
    console.log(`🌱 Seed: base ya tenía ${count} usuarios, no se agregó demo.`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
