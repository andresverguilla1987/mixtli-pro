import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Create a few demo users only if table is empty
  const count = await prisma.user.count()
  if (count === 0) {
    await prisma.user.createMany({
      data: [
        { name: 'Andrés', email: 'andres@example.com' },
        { name: 'Marta', email: 'marta@example.com' },
        { name: 'Luis',  email: 'luis@example.com' }
      ]
    })
    console.log('Seed: usuarios creados.')
  } else {
    console.log('Seed: ya existen usuarios, no se crean duplicados.')
  }
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
