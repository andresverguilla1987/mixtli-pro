const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.usuario.count();
  if (count === 0) {
    await prisma.usuario.create({
      data: { nombre: 'Usuario Demo', email: 'demo@example.com' }
    });
    console.log('Seed: usuario demo creado');
  } else {
    console.log('Seed: ya hay usuarios, no se insertó nada');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
