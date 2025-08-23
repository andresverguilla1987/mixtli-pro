const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.usuario.count();
  if (count === 0) {
    await prisma.usuario.createMany({
      data: [
        { nombre: 'Usuario Demo', email: `demo_${Date.now()}@example.com` },
      ]
    });
    console.log('Seed: usuarios creados');
  } else {
    console.log('Seed: ya hay usuarios, no se insertó nada');
  }
}

main().finally(() => prisma.$disconnect());
