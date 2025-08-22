import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main () {
  const count = await prisma.user.count()
  if (count === 0) {
    await prisma.user.create({
      data: {
        name: 'Mixtli Admin',
        email: 'admin@mixtli.local',
        password: 'changeme123'
      }
    })
    console.log('🌱 Seed: 1 usuario demo creado.')
  } else {
    console.log(`🌱 Seed: base ya tenía ${count} usuarios, no se agregó demo.`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
