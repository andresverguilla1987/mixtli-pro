import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count === 0) {
    await prisma.user.createMany({
      data: [
        { name: 'María', email: 'maria@example.com', password: '123456' },
        { name: 'Luis',  email: 'luis@example.com',  password: '123456' }
      ]
    });
    console.log('Seed: usuarios creados.');
  } else {
    console.log('Seed: ya había usuarios, no se insertó nada.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
