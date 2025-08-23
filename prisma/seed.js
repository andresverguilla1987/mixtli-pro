const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.usuario.count();
  if (count === 0) {
    await prisma.usuario.create({
      data: { nombre: 'Usuario Demo', email: `demo_${Date.now()}@example.com` }
    });
    console.log('Seed: usuario demo creado.');
  } else {
    console.log('Seed: ya existen usuarios, no se crean nuevos.');
  }
}

main().finally(() => prisma.$disconnect());
