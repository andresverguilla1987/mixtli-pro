const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = [
    { nombre: 'Ada Lovelace', email: 'ada@example.com' },
    { nombre: 'Grace Hopper', email: 'grace@example.com' },
    { nombre: 'Alan Turing', email: 'alan@example.com' }
  ];
  for (const user of data) {
    await prisma.usuario.upsert({
      where: { email: user.email },
      update: {},
      create: user
    });
  }
  console.log('Seed completado ✅');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Error en seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
