
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@mixtli.local';
  const passwordHash = await bcrypt.hash('Admin123*', 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Administrador',
      email,
      password: passwordHash,
      role: 'ADMIN'
    },
  });

  console.log('✅ Seed completado: admin@mixtli.local / Admin123*');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
